/**
 * "Report a problem": what visitors can report and how admins track it (Admin → Feedback). Shared by the
 * form, the API and the Admin tab.
 */

export const FEEDBACK_CATEGORIES = [
  { id: "bug", label: "Something is broken", hint: "A button, page or form does not work" },
  { id: "wrong_info", label: "Wrong or outdated info", hint: "A number, name, place or date is wrong" },
  { id: "map", label: "Map problem", hint: "Wrong location, missing road, map does not load" },
  { id: "slow", label: "Slow or not loading", hint: "The page takes too long or stays blank" },
  { id: "suggestion", label: "Suggestion", hint: "An idea to make it better" },
  { id: "other", label: "Something else", hint: "Anything not listed" },
] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]["id"];

/** Where the report was sent from. */
export const FEEDBACK_AREAS = [
  { id: "website", label: "OKB Website" },
  { id: "command", label: "Command Center" },
  { id: "mobile", label: "OKB Mobile" },
] as const;
export type FeedbackArea = (typeof FEEDBACK_AREAS)[number]["id"];

export const FEEDBACK_STATUSES = [
  { id: "new", label: "New" },
  { id: "in_progress", label: "In progress" },
  { id: "fixed", label: "Fixed" },
  { id: "wont_fix", label: "Won't fix" },
] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number]["id"];

export const FEEDBACK_MESSAGE_MIN = 5;
export const FEEDBACK_MESSAGE_MAX = 2000;
/** A screenshot as the form sends it (JPEG after resizing in the browser; PNG / WebP as they are). */
export const FEEDBACK_SCREENSHOT_MAX_BYTES = 4 * 1024 * 1024;

export const categoryLabel = (id: string) => FEEDBACK_CATEGORIES.find((c) => c.id === id)?.label ?? id;
export const areaLabel = (id: string) => FEEDBACK_AREAS.find((a) => a.id === id)?.label ?? id;
export const statusLabel = (id: string) => FEEDBACK_STATUSES.find((s) => s.id === id)?.label ?? id;

/** The Command Center lives under /command, OKB Mobile at /report-flood; everything else is the website. */
export function areaOfPath(pathname: string): FeedbackArea {
  if (pathname === "/command" || pathname.startsWith("/command/")) return "command";
  if (pathname.startsWith("/report-flood")) return "mobile";
  return "website";
}

/** One report as Admin → Feedback lists it. */
export interface FeedbackItem {
  id: string;
  reference: string;
  createdAt: string;
  updatedAt: string;
  category: FeedbackCategory;
  area: FeedbackArea;
  pageUrl: string;
  pageTitle: string | null;
  message: string;
  contact: string | null;
  /** Admin-only link to the attached screenshot. */
  screenshotUrl: string | null;
  device: string | null;
  screen: string | null;
  status: FeedbackStatus;
  adminNote: string | null;
  handledBy: string | null;
  resolvedAt: string | null;
}

export interface FeedbackList {
  items: FeedbackItem[];
  /** Open reports (new + in progress), whatever the filter. */
  open: number;
}

/** "FB-1A2B3C": short reference the sender sees and admins can search. */
export const feedbackReference = (id: string) => `FB-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
