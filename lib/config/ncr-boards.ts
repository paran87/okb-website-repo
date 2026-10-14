/**
 * The Canva boards behind Accomplishment → NCR Daily Accomplishment. The viewer shows their pages from the
 * latest to the oldest, so the board with the newest pages comes first. Each board is read from its public
 * /view page (the /edit link only works for the owner and cannot be framed).
 */
export interface NcrBoard {
  id: string;
  label: string;
  /** Public view link (a /edit link of the same design is shown to the Canva owner only). */
  url: string;
  /**
   * Pages 1..rendered are sharp images made from the board's PDF export (public/ncr-pages/<id>/<page>.webp).
   * Newer pages fall back to Canva's small previews until the next export.
   */
  rendered: number;
}

export const NCR_BOARDS: readonly NcrBoard[] = [
  {
    id: "accomplishment",
    label: "NCR Accomplishment",
    url: "https://www.canva.com/design/DAHRMM8rzTo/YWgmn3S9SahguALjUpdW1A/view",
    rendered: 178,
  },
  {
    id: "daily",
    label: "NCR Daily Accomplishment",
    url: "https://www.canva.com/design/DAHKF7VTZh4/b7tRxzCI84QZs_CKjFCJ9g/view",
    rendered: 468,
  },
];

export const ncrBoard = (id: string | null | undefined) => NCR_BOARDS.find((b) => b.id === id) ?? null;
