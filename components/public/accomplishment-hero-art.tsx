"use client";

import { useReducedMotion } from "framer-motion";

/** Relative heights of the ascending bars, as a fraction of the plot area. */
const BARS = [0.28, 0.4, 0.36, 0.55, 0.68, 0.62, 0.84, 0.95];

const PLOT = { x: 60, y: 40, width: 400, height: 250 } as const;
const BAR_GAP = 12;
const BAR_WIDTH = (PLOT.width - BAR_GAP * (BARS.length - 1)) / BARS.length;

const barX = (index: number) => PLOT.x + index * (BAR_WIDTH + BAR_GAP);

/** Centre point of each bar's top edge — the trend line rides these. */
const trendPoints = BARS.map((value, index) => ({
  x: barX(index) + BAR_WIDTH / 2,
  y: PLOT.y + PLOT.height - value * PLOT.height,
}));

const trendPath = trendPoints
  .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
  .join(" ");

const SPARKS = [
  { cx: 238, cy: 88, r: 2.6, delay: "0s" },
  { cx: 300, cy: 56, r: 1.9, delay: "1.4s" },
  { cx: 356, cy: 96, r: 2.2, delay: "2.6s" },
  { cx: 404, cy: 48, r: 1.7, delay: "3.8s" },
  { cx: 176, cy: 118, r: 1.6, delay: "5s" },
];

/** Completion dial tucked below the baseline, clear of the bar series. */
const RING_RADIUS = 24;

/**
 * Decorative "results" motif for the Accomplishment hero — a rising bar series,
 * a self-drawing trend line, and a completion ring.
 */
export function AccomplishmentHeroArt() {
  const reduce = useReducedMotion();
  const anim = (name: string) => (reduce ? undefined : name);

  return (
    <div className="okb-acc-art" aria-hidden>
      <svg viewBox="0 0 520 360" fill="none">
        <defs>
          <linearGradient id="okbAccBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffb265" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#f57e20" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id="okbAccBarLead" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ffb265" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="okbAccTrend" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8fd3ff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
          </linearGradient>
          <radialGradient id="okbAccGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#5aa9ff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#5aa9ff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="330" cy="150" r="180" fill="url(#okbAccGlow)" />

        {/* Measurement grid */}
        <g stroke="#ffffff" strokeOpacity="0.14" strokeWidth="1">
          {[0, 0.25, 0.5, 0.75, 1].map((step) => (
            <line
              key={step}
              x1={PLOT.x - 18}
              x2={PLOT.x + PLOT.width + 18}
              y1={PLOT.y + PLOT.height - step * PLOT.height}
              y2={PLOT.y + PLOT.height - step * PLOT.height}
              strokeDasharray={step === 0 ? undefined : "3 7"}
            />
          ))}
        </g>

        {/* Ascending bar series */}
        <g className={anim("okb-acc-bars")}>
          {BARS.map((value, index) => {
            const height = value * PLOT.height;
            const isLead = index === BARS.length - 1;

            return (
              <rect
                key={index}
                x={barX(index)}
                y={PLOT.y + PLOT.height - height}
                width={BAR_WIDTH}
                height={height}
                rx="3"
                fill={isLead ? "url(#okbAccBarLead)" : "url(#okbAccBar)"}
                className={anim("okb-acc-bar")}
                style={reduce ? undefined : { animationDelay: `${index * 0.11}s` }}
              />
            );
          })}
        </g>

        {/* Trend line drawing itself across the series */}
        <path
          d={trendPath}
          stroke="url(#okbAccTrend)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={anim("okb-acc-trend")}
        />

        {trendPoints.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={index === trendPoints.length - 1 ? 5 : 3}
            fill="#ffffff"
            className={anim("okb-acc-node")}
            style={reduce ? undefined : { animationDelay: `${1 + index * 0.11}s` }}
          />
        ))}

        {/* Pulse on the leading value */}
        <circle
          cx={trendPoints[trendPoints.length - 1]!.x}
          cy={trendPoints[trendPoints.length - 1]!.y}
          r="5"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          className={anim("okb-acc-pulse")}
        />

        {/* Completion dial */}
        <g transform="translate(462 322)">
          <circle
            r={RING_RADIUS}
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.18"
            strokeWidth="6"
          />
          <circle
            r={RING_RADIUS}
            fill="none"
            stroke="#f57e20"
            strokeWidth="6"
            strokeLinecap="round"
            transform="rotate(-90)"
            className={anim("okb-acc-ring")}
            style={{ strokeDasharray: 2 * Math.PI * RING_RADIUS }}
          />
        </g>

        {SPARKS.map((spark, index) => (
          <circle
            key={index}
            cx={spark.cx}
            cy={spark.cy}
            r={spark.r}
            fill="#ffffff"
            fillOpacity="0.55"
            className={anim("okb-acc-spark")}
            style={reduce ? undefined : { animationDelay: spark.delay }}
          />
        ))}
      </svg>
    </div>
  );
}
