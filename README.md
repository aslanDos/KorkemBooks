# KorkemBooks

Сервис создания персональных книг из собственных историй и ответов на вопросы. Позволяет редактировать текст, добавлять фотографии, настраивать обложку и просматривать готовую книгу.

Стек: Next.js, React, TypeScript и Supabase.

## Локальный запуск

Используйте Node.js версии из `.nvmrc`.

```bash
npm ci
cp .env.example .env.local
```

Заполните `.env.local` настройками своего проекта Supabase. Примените SQL-файлы из `supabase/migrations` в порядке их названий; короткий индекс по месяцам и версиям находится в [`supabase/migrations/README.md`](supabase/migrations/README.md). Ключ `SUPABASE_SERVICE_ROLE_KEY` предназначен только для сервера.

```bash
npm run dev
```

Откройте [localhost:3000](http://localhost:3000).

## Проверки и сборка

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```
