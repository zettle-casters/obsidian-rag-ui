# Obsidian RAG Web UI

Минималистичный веб-интерфейс для работы с Obsidian RAG системой.

## Технологии

- **Next.js 15** — React фреймворк с App Router
- **TypeScript** — типизация
- **Tailwind CSS** — стилизация
- **shadcn/ui** — компоненты UI
- **Lucide Icons** — иконки

## Возможности

- 🎯 **Drag & Drop загрузка** — перетащите .zip файл с vault на страницу
- 📊 **Прогресс в реальном времени** — визуализация обработки через Server-Sent Events
- 💬 **Интерактивный чат** — общение с RAG агентом с стриминговыми ответами
- 📁 **Управление vault'ами** — просмотр всех загруженных хранилищ

## Локальная разработка

```bash
# Установка зависимостей
npm install

# Настройка окружения
cp .env.local.example .env.local
# Отредактируйте .env.local, укажите NEXT_PUBLIC_API_URL

# Запуск dev сервера
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

## Docker

UI автоматически запускается через docker-compose из корневой директории проекта:

```bash
cd ..
docker compose up -d --build
```

UI будет доступен на [http://localhost:3000](http://localhost:3000)

## Архитектура

```
app/
├── page.tsx           # Главная страница с drag-and-drop
├── layout.tsx         # Root layout
└── globals.css        # Глобальные стили

components/
├── VaultsList.tsx     # Список загруженных vault'ов
├── UploadProgress.tsx # Индикатор прогресса загрузки
├── ChatInterface.tsx  # Интерфейс чата с RAG
└── ui/                # shadcn/ui компоненты
    ├── button.tsx
    ├── card.tsx
    ├── progress.tsx
    ├── scroll-area.tsx
    └── dialog.tsx

lib/
├── api.ts             # API клиент для взаимодействия с backend
└── utils.ts           # Утилиты
```

## Переменные окружения

- `NEXT_PUBLIC_API_URL` — URL API бэкенда (по умолчанию: `http://localhost:8000`)

## API Integration

UI взаимодействует с backend через REST API и Server-Sent Events:

- `GET /vaults` — получение списка vault'ов
- `POST /upload/stream` — загрузка vault с прогрессом (SSE)
- `POST /agent/stream` — общение с агентом (SSE)

## Стилизация

Минималистичный дизайн в стиле GitHub с цветовой схемой:
- Основные цвета: черный, белый, серый
- Акцентный цвет: фиолетовый
- Язык интерфейса: русский
