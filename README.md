# 🌍 Real World Map — Render MVP

A mobile-first 2D/3D world map MVP with persistent custom places, search, favorites, editing, and server-side VIP validation.

## Stack

- React + TypeScript + Vite
- MapLibre GL JS
- Node.js + Express + TypeScript
- Prisma + PostgreSQL
- Render Web Service + PostgreSQL

## Deploy on Render

1. Create a GitHub repository and upload this project.
2. In Render, choose **New → Blueprint** and select the repository.
3. Render reads `render.yaml`.
4. In the created Web Service, set:
   - `MAPTILER_API_KEY` = your licensed MapTiler key (or adapt the map style URL/provider).
   - `VIP_CODE` = your secret VIP code.
5. Deploy.

Do not put production secrets into source code.

## Local

```bash
npm install
npm run dev
```

Create `backend/.env` or root environment variables as needed. For PostgreSQL, set `DATABASE_URL`.

## Map data

The app uses MapLibre and a configurable MapTiler style URL when `MAPTILER_API_KEY` exists. Replace the provider/style with any provider whose license and terms allow your intended use. Do not scrape Google Maps.

## API

- `GET /api/health`
- `GET /api/places`
- `POST /api/places`
- `PATCH /api/places/:id`
- `DELETE /api/places/:id`
- `POST /api/vip/verify`

## Notes

3D terrain/buildings and satellite imagery depend on the selected licensed map provider/style. The app does not fabricate real-world data.
