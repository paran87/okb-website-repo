# Working agreements

## Git workflow
- Commit directly to `main` and push to `main`. Do not create branches or pull requests unless asked.
- Group related changes into one commit per task. Every push to `main` triggers a Vercel production deploy, and the free plan limits deployments per day.
- Before pushing, run `npx tsc --noEmit` and `npx eslint` on the files you changed.
- Never force-push `main`.

## Project notes
- Next.js app (App Router) deployed on Vercel; the Floodwatch data comes from `https://floodwatch-ten.vercel.app/` through `/api/floodwatch/*`.
- River basin study PDFs live in a Cloudflare R2 bucket (origin in `lib/config/study-storage.json`) and are served through the same-origin path `/studies/<id>.pdf` (rewrite in `next.config.ts`); until that is set, the viewer uses the Google Drive route. Pipeline scripts are in `scripts/river-basin-studies/` (`optimize_all.py`, then `upload-r2.mjs`).
- Waterway river tiles for the default view are pre-rendered into `public/waterway-tiles/v1/` (rebuild with `scripts/waterway-tiles/render.py`; filtered views and zoom 13+ use live tiles from `/api/waterways/tiles`).
- Vercel Blob (Hobby) is capped at 1 GB per store and is no longer used for the study PDFs.
- Road network data is bundled in `public/data/road-network/` (rebuild with `node scripts/build-road-network.mjs`); river basin outlines are in `public/data/river-basins/` (rebuild with `node scripts/build-river-basin-geo.mjs`).
