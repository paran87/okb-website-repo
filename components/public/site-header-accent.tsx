/** Ridge line reused for every contour band in the masthead artwork. */
const RIDGE_PATH =
  "M-80 196 C 110 150 200 58 372 104 C 520 143 636 200 812 186 C 1000 171 1180 214 1520 168";

/** Vertical offsets that turn the single ridge into a topographic map. */
const CONTOUR_OFFSETS = [-96, -68, -42, -18, 6, 30, 56, 84] as const;

const FLOW_PATHS = [
  "M-40 62 C 170 32 296 88 470 58 C 650 28 776 82 956 56 C 1136 30 1284 76 1480 50",
  "M-40 84 C 160 54 300 106 480 78 C 660 50 780 100 960 76 C 1140 52 1280 96 1480 70",
  "M-40 106 C 150 78 310 126 486 100 C 664 74 786 120 966 98 C 1146 76 1286 116 1480 94",
] as const;

/**
 * Decorative masthead artwork: a topographic ridge, drifting survey grid,
 * flowing waterlines and the OKB emblem as a watermark — the "ridge to reef"
 * story of the program rendered behind the brand lockup.
 */
export function SiteHeaderAccent() {
  return (
    <div className="okb-mast-art" aria-hidden>
      <span className="okb-mast-art__aurora" />
      <span className="okb-mast-art__grid" />
      <span className="okb-mast-art__emblem" />

      <svg
        className="okb-mast-art__topo"
        viewBox="0 0 1440 220"
        preserveAspectRatio="none"
      >
        <g fill="none" stroke="#ffffff" strokeWidth="1.15" strokeLinecap="round">
          {CONTOUR_OFFSETS.map((offset, index) => (
            <path
              key={offset}
              d={RIDGE_PATH}
              transform={`translate(0 ${offset})`}
              opacity={0.62 - index * 0.06}
            />
          ))}
        </g>
      </svg>

      <svg
        className="okb-mast-art__flow"
        viewBox="0 0 1440 140"
        preserveAspectRatio="none"
      >
        <g fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round">
          {FLOW_PATHS.map((path, index) => (
            <path
              key={path}
              className="okb-mast-flowline"
              d={path}
              opacity={0.5 - index * 0.1}
              style={{ animationDelay: `${index * -2.6}s` }}
            />
          ))}
        </g>
      </svg>

      <span className="okb-mast-art__hatch okb-mast-art__hatch--left" />
      <span className="okb-mast-art__hatch okb-mast-art__hatch--right" />
      <span className="okb-mast-art__chevron okb-mast-art__chevron--left" />
      <span className="okb-mast-art__chevron okb-mast-art__chevron--right" />
      <span className="okb-mast-art__grain" />
      <span className="okb-mast-art__sheen" />
    </div>
  );
}
