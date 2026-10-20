# Working agreements

## Git workflow
- Commit directly to `main` and push to `main`. Do not create branches or pull requests unless asked.
- Group related changes into one commit per task. Every push to `main` triggers a Vercel production deploy, and the free plan limits deployments per day.
- Before pushing, run `npx tsc --noEmit` and `npx eslint` on the files you changed.
- Never force-push `main`.

## UI: mobile first
- The OKB Command Center is designed mobile first. For any UI work, build and check the phone layout (~390px wide) first, then add larger-screen layouts with `sm:`/`md:`/`lg:`/`xl:` or container queries (`@container`, `@xl:` …).
- Never let content get cut off or scroll sideways on a phone. Wide tables need a stacked card/row layout for narrow widths and show the table only where it fits (see `features/incident/components/incidents-view.tsx`).
- Every screen must stay usable with touch: tap targets at least ~40px, no hover-only actions.
- Check UI changes in a browser at 390px before pushing.

## Project notes
- Next.js app (App Router) deployed on Vercel; the Floodwatch data comes from `https://floodwatch-ten.vercel.app/` through `/api/floodwatch/*`.
- River basin study PDFs live in a Cloudflare R2 bucket (origin in `lib/config/study-storage.json`) and are served through the same-origin path `/studies/<id>.pdf` (rewrite in `next.config.ts`); until that is set, the viewer uses the Google Drive route. Pipeline scripts are in `scripts/river-basin-studies/` (`optimize_all.py`, then `upload-r2.mjs`). Each study is also split into ~3 MB standalone chunk PDFs (`split_pdfs.py` → `upload-r2-chunks.mjs`, manifest `lib/config/river-basin-chunks.json`); the viewer opens a study by loading its first chunk (one request) and prefetches the next, which avoids pdf.js's many serial range requests. Word documents are listed in `lib/config/river-basin-nonpdf.json` and shown with a Drive link.
- Waterway river tiles for the default view are pre-rendered into `public/waterway-tiles/v1/` (rebuild with `scripts/waterway-tiles/render.py`; filtered views and zoom 13+ use live tiles from `/api/waterways/tiles`).
- Vercel Blob (Hobby) is capped at 1 GB per store and is no longer used for the study PDFs.
- Road network data is bundled in `public/data/road-network/` (rebuild with `node scripts/build-road-network.mjs`); river basin outlines are in `public/data/river-basins/` (rebuild with `node scripts/build-river-basin-geo.mjs`).
- Program coverage names that the live accomplishment dashboard does not trace get their map location from `lib/config/coverage-geo.json` (OpenStreetMap; rebuild with `node scripts/build-coverage-geo.mjs`, add new names to its `SOURCES`).
- `/report-flood` is the mobile-only public flood report page (`features/flood-report/`): camera with GPS stamp + EXIF, up to 5 photos to the operations R2 bucket under `flood-reports/`, then a form. Reports are written into `okb_bridge_reports` as platform `okb_mobile`, status `needs_review` (shown in Incoming Reports and on the flood maps; reviewed in Supabase directly, not through the bridge). `extractionMeta.extractedAt` stays null so the bridge's consolidated WhatsApp report skips unverified public reports. The page's `Permissions-Policy` allows the camera (`next.config.ts`). Without a receded time a mobile report leaves the public map and the Incidents flood map by the sender's weather: 2 h clear, 3 h cloudy, 4–6 h rain, at least 4 h while PAGASA reports rain (`features/flood-report/lib/expiry.ts`); its photos show in the Incidents flood alert panel and location cards.
