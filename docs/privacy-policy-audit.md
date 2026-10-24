# Privacy audit — OKB website and Command Center

Audit date: 24 October 2026. Basis: the code in this repository at commit `6436771`.
This is the internal record behind the public page `app/(public)/privacy-policy/page.tsx`.
Every statement on that page should trace back to a **Verified** item here.

Legend: **Verified** = read in the code. **Inferred** = a reasonable reading of the code that needs
confirmation. **Unknown** = cannot be established from this repository.

---

## 1. Confirmed technologies and services

| Service | Use | Status |
| --- | --- | --- |
| Next.js (App Router), deployed on Vercel | Website, Command Center, Admin, all `/api/*` routes | Verified (`vercel.json`, `CLAUDE.md`) |
| Vercel request geolocation headers | City / region / country of a page view (`x-vercel-ip-*`) | Verified (`app/api/track/route.ts`) |
| Supabase (PostgreSQL, the OKB Bridge project) | `okb_bridge_reports` (WhatsApp / Viber / OKB Mobile reports), `okb_site_visits`, `okb_site_media`, `okb_gallery_reactions`, `okb_gallery_comments`, `okb_site_feedback`, Command Center incidents | Verified (`supabase/migrations/*`, `features/*/server/*`) |
| Cloudflare R2 (operations bucket) | Flood-report photos, videos and posters (`flood-reports/`), operator-added media (`report-media/`), feedback screenshots (`site-feedback/`), operations media | Verified (`features/operations/server/r2.ts`, `features/flood-report/server/media.ts`) |
| Cloudflare R2 (study bucket) | River basin study PDFs (public documents, no personal data) | Verified |
| Anthropic API (Claude) | Checks OKB Mobile report photos / video frames for floodwater, only when photos are far apart enough to draw a stretch and `ANTHROPIC_API_KEY` is set | Verified (`features/flood-report/server/photo-check.ts`) |
| OpenStreetMap Nominatim | Reverse geocoding of a report's coordinates into a place name (server-side) | Verified (`features/flood-report/server/service.ts`) |
| FOSSGIS OSRM (`routing.openstreetmap.de`) | Walking route between two photo positions of a report (server-side, only for possible stretches) | Verified (`features/flood-report/server/stretch.ts`) |
| Map tile / imagery hosts loaded by the visitor's browser | CARTO basemaps, OpenFreeMap, Esri ArcGIS imagery, OpenTopoMap, RainViewer radar | Verified (`features/map/config/map-styles.ts`, `features/weather/components/weather-radar-overlay.tsx`) |
| Google (Drive, Sheets / Apps Script, googleusercontent) | Gallery images and videos, river basin files, OKB SSOT coverage data, accomplishment photos | Verified (`lib/config/gallery-drive.json`, `features/accomplishment/*`) |
| YouTube (`youtube-nocookie.com`) | Gallery video embeds (loaded only when a visitor opens the video) | Verified (`components/public/gallery/gallery-grid.tsx`) |
| Floodwatch (`floodwatch-ten.vercel.app`) | Drainage data via `/api/floodwatch/*` and an iframe in Command Center → Drainages | Verified |
| PAGASA, Canva | Weather data (server); NCR board images proxied by the server | Verified |
| OKB Bridge (`okb-bridge-cloud-backend`, separate system) | Writes WhatsApp / Viber messages and AI extractions into `okb_bridge_reports`; sends the automated WhatsApp consolidated report | Verified that it exists and what it stores; its code is **not** in this repo |
| Auth.js (next-auth v5) | Installed, **no login providers** configured | Verified (`features/reports/server/access.ts` comment, `proxy.ts`) |
| Prisma | Client installed; used by `/api/health` and repository foundation | Verified; no personal-data use found |
| Google Analytics, AdSense, other ad / tracking scripts | **None found** | Verified absent (repo-wide search) |
| Vercel Analytics / Speed Insights | **Not installed** | Verified absent |

## 2. Information collected, by feature

| Feature | Data | Required? | Source |
| --- | --- | --- | --- |
| Page-view analytics (`VisitTracker` → `/api/track`) | Path, page title, external referrer (first page of a session), screen size, browser language, browser / OS / device type parsed from user agent, city / region / country from Vercel, random visitor id (`okb_vid` cookie, 400 days) and session id (`okb_sid` cookie, 30 min). **No IP stored.** Bots and `/admin` skipped. | Automatic, no opt-out | Browser + Vercel headers |
| OKB Mobile flood report (`/report-flood`) | Photos (≤5) with GPS stamp drawn on the image and EXIF (GPS, time); optional video (no sound) with a GPS track of ~1 fix/s; device coordinates and accuracy; flood level / depth, road status, weather, start / receded time, location text, landmark, remarks, optional DEO; optional name; optional mobile number; place name from Nominatim | Photos/video + location required; name, number, remarks optional | Visitor |
| OKB Mobile edit key | Random secret returned once; only its SHA-256 stored (`record.mobile.ownerTokenHash`); key kept in browser `localStorage` and in an edit link (`#edit=…`) | Automatic | Server |
| OKB Mobile IP use | IP read from request headers for in-memory rate limiting and for the `OKB_MOBILE_REPORT_TEST_IPS` check; `/api/flood-reports/whoami` echoes it back to the caller. **Not stored in the report.** | Automatic | Request |
| AI photo check | Report photos / video first+last frames (with the printed GPS / time stamp) sent to Anthropic; result ("flooded yes/no/unclear" + short note) stored in the stretch analysis | Automatic when conditions met | Server |
| WhatsApp / Viber reports (via OKB Bridge) | Group name, sender name, sender id, device id, source package, full message text, timestamps, AI extraction + AI summary, review history | n/a (from groups) | OKB Bridge |
| Gallery and map reactions / comments | Reaction, comment text (≤500 chars), random visitor id kept in `localStorage`; shown as "Anonymous". IP not stored. | Optional | Visitor |
| Report a problem (`/api/feedback`) | Category, message, page URL / title, area, device summary, user agent, screen size, optional contact (e-mail or number), optional screenshot (R2 `site-feedback/`). IP used for rate limiting only. | Message required; contact + screenshot optional | Visitor |
| Admin sign-in | Admin key check; signed httpOnly cookie `okb_admin` (12 h) holding the admin's typed name | Admins only | Admin |
| Operator access | Signed httpOnly cookie `okb_reports_access` (12 h) with the operator's typed name, only for gated areas (Settings, Operations) | Operators only | Operator |
| Operator actions | Reviewer name on reviews and incidents, admin notes on feedback, media captions / place / coordinates | Operators only | Operator |
| Browser storage (not cookies) | Theme; help-tip / FAB tip dismissed; Accomplishment view preferences; gallery visitor id; own report edit keys; camera-permission tip | Functional | Browser |
| Server logs | pino logs on Vercel with secret fields redacted; include report ids and error details | Automatic | Server |

## 3. Where it is stored

- Supabase (OKB Bridge project): reports, visits, gallery engagement, feedback, media captions, incidents.
- Cloudflare R2 operations bucket: photos, videos, posters, screenshots, operator media.
- Visitor's browser: cookies `okb_vid`, `okb_sid` (and `okb_admin` / `okb_reports_access` for staff); `localStorage` items above.
- Vercel: runtime logs (retention per Vercel plan — Unknown).
- Region of the Supabase project, the R2 bucket jurisdiction and the Vercel function region: **Unknown** (configured outside the repo).

## 4. Recipients

- Anthropic: report photos / frames (when the check runs).
- OpenStreetMap Nominatim and FOSSGIS OSRM: report coordinates (no other report content).
- Map tile hosts, Google, YouTube, Floodwatch: the visitor's IP address and normal browser request data, because the browser loads content from them.
- OKB Bridge and the recipients of its automated WhatsApp report: mobile reports only when `inConsolidated` is set (currently test IPs / `all`).
- Supabase, Cloudflare, Vercel: as hosting / storage providers.

## 5. Public, restricted, confidential

| Data | Visibility |
| --- | --- |
| Mobile report photos (incl. EXIF GPS and the printed stamp), videos, location, flood details, remarks, landmark, **sender name** | **Public** on the OKB Mobile map and `/api/flood-reports/media` |
| Mobile report video GPS track | Not in the public map payload; stored in the record |
| Mobile report mobile number | Not on the public map. **See risk R1** |
| WhatsApp / Viber reports on the public map | Location, flood details and message text with phone numbers and e-mail addresses removed; no sender name |
| WhatsApp / Viber full messages, sender names, ids | Command Center Reports / Incidents. **See risk R1** |
| Gallery comments | Public, as "Anonymous" |
| Feedback, screenshots, visitor analytics | Admin only (`okb_admin` cookie) |

## 6. Retention and deletion (verified behaviour)

- Mobile reports stay in Supabase until deleted by the sender (edit key) or an operator; leaving the public map after 2–6 h is a display rule, not deletion. Deleting removes the record, its R2 media and its gallery reactions / comments. A report linked to an incident cannot be deleted by the sender.
- WhatsApp / Viber reports: deleted through the bridge (`DELETE /api/v1/reports/:id`).
- Visits, feedback, comments, reactions: **no automatic deletion found**.
- Cookies: `okb_vid` 400 days, `okb_sid` 30 min, staff cookies 12 h.
- Supabase backups, R2 versioning, Vercel log retention: **Unknown**.
- **No approved retention schedule exists.**

## 7. Existing safeguards (verified)

- HTTPS on Vercel; security headers (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` with microphone off and camera / geolocation self only).
- Supabase tables have RLS on with no policies; only the server (service-role key) reads / writes.
- Signed, httpOnly cookies for admin / operator access; same-origin checks on state-changing requests.
- Edit keys stored only as SHA-256; constant-time comparison.
- Rate limits and honeypots on public forms; IPs not persisted.
- Public WhatsApp text has phone numbers and e-mails removed.
- Feedback screenshots readable only by signed-in admins.
- Logger redacts secret fields.

## 8. Missing information (cannot be established from code)

1. Personal Information Controller (legal entity) and whether DPWH has authorized / owns this site.
2. Data Protection Officer and privacy contact. The site's current contact address is a personal Gmail address.
3. Lawful basis for each processing activity (RA 10173 Sec. 12 / 13; possibly RA 10121 mandates).
4. Retention schedule; backup and log retention.
5. Hosting regions; data processing agreements with Vercel, Supabase, Cloudflare, Anthropic.
6. Anthropic account data-retention / training settings.
7. OKB Bridge: how messages are captured (fields `deviceId`, `sourcePackage` suggest an Android notification relay — **Inferred**), which groups, who authorized it, which AI provider it uses, and who receives the automated WhatsApp report.
8. NPC registration status, privacy impact assessment, breach-response procedure.
9. Whether advertising (AdSense) is actually planned, and for which audiences.

## 9. Privacy risks and recommended actions

| # | Risk | Severity | Recommendation |
| --- | --- | --- | --- |
| R1 | `/api/reports*` and `/api/incidents*` (area "reports") are served to **anyone** when the reports store is configured (`GATED_AREAS` only contains settings + operations). These return WhatsApp sender names / ids, full message text, and OKB Mobile **mobile numbers** — while the report form says "Your number is seen only by OKB operators". | **High — fix before publishing the policy** | Gate the "reports" area (or strip `contactNumber`, `senderId`, `senderName`, `messageText`, `deviceId` from ungated responses). |
| R2 | Sender name is published on the public map. | Medium | Keep the form notice; consider showing initials only. |
| R3 | Photos are public with exact GPS in EXIF and printed on the image; may show faces, plate numbers, homes. | Medium | Strip EXIF from the public copy; blur guidance; operator takedown process. |
| R4 | Analytics cookie set without notice or opt-out. | Medium (PH: transparency); High if EEA/UK ads are added | Policy discloses it (done); consider a notice / opt-out. |
| R5 | No retention limits on visits, feedback, comments, reports. | Medium | Adopt a schedule and add scheduled deletion. |
| R6 | Personal Gmail as the program contact. | Medium | Use an official, monitored privacy mailbox. |
| R7 | `/api/flood-reports/whoami` echoes the caller's IP (only to that caller). | Low | Remove or admin-gate after testing. |
| R8 | Photos sent to an AI provider abroad. | Low–medium | Confirm provider terms; disclose (done). |

## 10. Assumptions requiring confirmation

- That the site is operated for / under DPWH Oplan Kontra Baha. The page does **not** claim official authorization.
- That OKB Mobile reports are intended to be public (the form says so) and mobile numbers are intended for operators only.
- That advertising is not live. The policy describes AdSense only as a possible future addition.

---

## AdSense readiness (as of this audit)

- No ad code, no consent-management platform, no analytics from Google. Nothing to disclose about ad cookies today.
- If AdSense is added, Google requires the privacy policy to disclose third-party vendor cookies, Google's advertising cookies, and the opt-out links (Ads Settings, aboutads.info) — <https://support.google.com/adsense/answer/1348695>.
- Serving ads to users in the EEA, UK or Switzerland requires a Google-certified CMP integrated with the IAB TCF — <https://support.google.com/adsense/answer/13554116>.
- A government-associated site carrying ads raises a separate policy question for the responsible office.
- Publishing a privacy policy does not by itself make a site eligible for AdSense.
