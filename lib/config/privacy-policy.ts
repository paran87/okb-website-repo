/**
 * Facts the Privacy Policy page (app/(public)/privacy-policy) cannot take from the code. Every `null` is shown
 * on the page as a marked placeholder; fill them in only with details the responsible office has confirmed
 * (see docs/privacy-policy-audit.md → "Missing information").
 */
export const PRIVACY_POLICY = {
  /** "draft" shows a banner and keeps the page out of search results; set to "published" once approved. */
  status: "draft" as "draft" | "published",
  /** Date of this text (not backdated). */
  lastUpdated: "2026-10-24",
  /** Date the approved policy takes effect, e.g. "2026-11-15". */
  effectiveDate: null as string | null,
  /** The Personal Information Controller (legal name of the office responsible for this site). */
  controller: null as string | null,
  /** Mailing address of the controller. */
  address: null as string | null,
  /** Monitored mailbox for privacy requests. */
  privacyEmail: null as string | null,
  /** Data Protection Officer (name or office) and contact. */
  dpo: null as string | null,
  /** How long each kind of record is kept, once a retention schedule is approved. */
  retention: null as string | null,
} as const;
