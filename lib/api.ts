const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Vault {
  vault_id: string;
  name: string;
  created_at: string;
  notes_count: number;
}

export interface UploadProgress {
  stage: string;
  progress: number;
  message: string;
  elapsed?: string;
  eta?: string;
  vault_id?: string;
  notes_count?: number;
  error?: string;
}

export interface AuthUser {
  id: string;
  email?: string | null;
  name?: string | null;
  avatar_url?: string | null;
  is_demo: boolean;
}

export interface McpTokenInfo {
  token: string;
  created_at: string;
  last_used_at?: string | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function fetchMe(): Promise<AuthUser | null> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: 'include',
  });
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  return data.user as AuthUser;
}

export function loginWithGoogle(returnTo?: string) {
  const target = returnTo || window.location.href;
  const url = `${API_BASE_URL}/auth/google/login?return_to=${encodeURIComponent(target)}`;
  window.location.href = url;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function fetchMcpToken(): Promise<McpTokenInfo | null> {
  const response = await fetch(`${API_BASE_URL}/auth/mcp-token`, {
    credentials: 'include',
  });
  if (response.status === 403) {
    return null;
  }
  if (!response.ok) {
    throw new Error('Failed to fetch MCP token');
  }
  return (await response.json()) as McpTokenInfo;
}

export async function rotateMcpToken(): Promise<McpTokenInfo> {
  const response = await fetch(`${API_BASE_URL}/auth/mcp-token/rotate`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to rotate MCP token');
  }
  return (await response.json()) as McpTokenInfo;
}

export async function fetchVaults(): Promise<Vault[]> {
  const response = await fetch(`${API_BASE_URL}/vaults`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch vaults');
  }
  const data = await response.json();
  return Array.isArray(data.vaults) ? data.vaults : [];
}

export async function uploadVault(
  file: File,
  vaultName: string,
  onProgress: (progress: UploadProgress) => void
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('vault_name', vaultName);
  formData.append('chunk_size', '500');

  const response = await fetch(`${API_BASE_URL}/upload/stream`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to upload vault');
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let vaultId = '';

  if (!reader) {
    throw new Error('No response body');
  }

  try {
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Append new chunk to buffer
      buffer += decoder.decode(value, { stream: true });

      // Split by double newline (SSE message separator)
      const messages = buffer.split('\n\n');

      // Keep the last incomplete message in buffer
      buffer = messages.pop() || '';

      for (const message of messages) {
        const lines = message.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              if (jsonStr.trim()) {
                const data = JSON.parse(jsonStr);
                onProgress(data);
                if (data.vault_id) {
                  vaultId = data.vault_id;
                }
              }
            } catch (e) {
              console.error('Failed to parse upload SSE data:', line, e);
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return vaultId;
}

export async function* streamAgentResponse(
  query: string,
  vaultId: string,
  threadId?: string
): AsyncGenerator<any> {
  const response = await fetch(`${API_BASE_URL}/agent/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      vault_id: vaultId,
      thread_id: threadId,
    }),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to query agent');
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No response body');
  }

  try {
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Append new chunk to buffer
      buffer += decoder.decode(value, { stream: true });

      // Split by double newline (SSE message separator)
      const messages = buffer.split('\n\n');

      // Keep the last incomplete message in buffer
      buffer = messages.pop() || '';

      for (const message of messages) {
        const lines = message.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              if (jsonStr.trim()) {
                const data = JSON.parse(jsonStr);
                yield data;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', line, e);
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function* streamTestRun(): AsyncGenerator<any> {
  const response = await fetch(`${API_BASE_URL}/tests/run`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to start tests');
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No response body');
  }

  try {
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.slice(6);
            if (jsonStr.trim()) {
              const data = JSON.parse(jsonStr);
              yield data;
            }
          } catch (e) {
            console.error('Failed to parse test SSE data:', line, e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function fetchTestResults(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/tests/results`, {
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch test results');
  }
  return await response.json();
}
