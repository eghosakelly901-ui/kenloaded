# K-LOADED Music Platform

A full-stack starter for a music discovery and downloads platform. The frontend is a Next.js App Router application; API routes, role-aware sessions, PostgreSQL models, and S3-compatible media storage are included as foundations.

## Requirements

- Node.js 20.9 or later
- PostgreSQL 14+
- S3-compatible object storage for audio and artwork

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and configure PostgreSQL, an `AUTH_SECRET`, and object storage.
3. Run `npm run db:generate`, then `npm run db:migrate`.
4. Start the local site with `npm run dev`.

Uploads are held for administrator approval. Public downloads are generated only for approved tracks marked downloadable. Upload endpoints validate content type, file extension, size and the uploader's copyright confirmation before creating a short-lived signed storage upload URL. The browser does not store audio files in the database.

The initial dataset displayed in the UI is clearly marked demo content and does not expose fictional downloads. Configure object storage, create an admin user through a protected operator workflow, and add licensed tracks before enabling public distribution.

## API outline

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/songs`, `POST /api/songs` (authorized upload request)
- `GET /api/songs/:id`, `POST /api/songs/:id/play`, `POST /api/songs/:id/download`
- `PATCH /api/admin/songs/:id` (admin moderation)

Never commit `.env.local` or storage credentials. For production, terminate TLS at the host, use managed PostgreSQL and object storage, configure backups and rate limiting, and review privacy, copyright and moderation policies.
