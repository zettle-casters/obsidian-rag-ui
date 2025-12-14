import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a UUID v4 string
 * Falls back to a simple random-based implementation if crypto.randomUUID() is not available
 */
export function generateUUID(): string {
  // Try to use the native crypto.randomUUID() if available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID()
    } catch (e) {
      console.warn('crypto.randomUUID() failed, falling back to random implementation:', e)
    }
  }
  
  // Fallback implementation for environments without crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
