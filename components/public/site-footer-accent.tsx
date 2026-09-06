/** Ridge reused for every contour band in the footer artwork. */
const RIDGE_PATH =
  "M-80 168 C 140 210 260 96 430 142 C 590 182 720 88 900 128 C 1080 168 1240 74 1520 118";

const CONTOUR_OFFSETS = [-88, -62, -38, -16, 6, 28, 52, 78] as const;

const FLOW_PATHS = [
  "M-40 28 C 180 8 320 46 500 22 C 680 0 820 40 1000 18 C 1180 -2 1320 34 1520 12",
  "M-40 48 C 170 26 330 64 510 42 C 690 20 830 58 1010 38 C 1190 18 1330 52 1520 34",
  "M-40 68 C 160 48 340 82 520 62 C 700 42 840 76 1020 58 C 1200 40 1340 70 1520 54",
] as const;

/**
 * Decorative footer artwork — the same ridge-to-reef language as the
 * masthead and page heroes, flipped so waterlines sit at the top edge
 * and carry the page into the close.
 */
export function SiteFooterAccent() {
  return (
    <div className="okb-foot-art" aria-hidden>
      <span className="okb-foot-art__aurora" />
      <span className="okb-foot-art__aurora okb-foot-art__aurora--warm" />
      <span className="okb-foot-art__grid" />

      <svg
        className="okb-foot-art__topo"
        viewBox="0 0 1440 260"
        preserveAspectRatio="none"
      >
        <g fill="none" stroke="#ffffff" strokeWidth="1.15" strokeLinecap="round">
          {CONTOUR_OFFSETS.map((offset, index) => (
            <path
              key={offset}
              d={RIDGE_PATH}
              transform={`translate(0 ${offset})`}
              opacity={0.58 - index * 0.055}
            />
          ))}
        </g>
      </svg>

      <svg
        className="okb-foot-art__flow"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <g fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round">
          {FLOW_PATHS.map((path, index) => (
            <path
              key={path}
              className="okb-mast-flowline"
              d={path}
              opacity={0.48 - index * 0.1}
              style={{ animationDelay: `${index * -2.4}s` }}
            />
          ))}
        </g>
      </svg>

      <span className="okb-foot-art__hatch" />
      <span className="okb-foot-art__grain" />
      <span className="okb-foot-art__vignette" />
    </div>
  );
}
