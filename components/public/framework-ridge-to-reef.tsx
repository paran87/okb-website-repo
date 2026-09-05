"use client";

import { useReducedMotion } from "framer-motion";

/** Animated landscape from uplands to coast — the Ridge-to-Reef principle. */
export function FrameworkRidgeToReef() {
  const reduce = useReducedMotion();

  return (
    <svg
      viewBox="0 0 1200 420"
      className="okb-fw-scene h-auto w-full"
      role="img"
      aria-label="Illustration of the Ridge-to-Reef approach: mountains, forest, river, floodplain, city drainage, estuary, and coastal reef connected by flowing water."
    >
      <defs>
        <linearGradient id="okbFwSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7eb6e8" />
          <stop offset="55%" stopColor="#c5dff6" />
          <stop offset="100%" stopColor="#eef6fb" />
        </linearGradient>
        <linearGradient id="okbFwSea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3aa0d6" />
          <stop offset="100%" stopColor="#0a4f86" />
        </linearGradient>
        <linearGradient id="okbFwRiver" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5ec8f0" />
          <stop offset="50%" stopColor="#2b8fd4" />
          <stop offset="100%" stopColor="#1a6fb8" />
        </linearGradient>
        <linearGradient id="okbFwHill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3d8b4a" />
          <stop offset="100%" stopColor="#1f5a32" />
        </linearGradient>
        <linearGradient id="okbFwPeak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dfe7ef" />
          <stop offset="40%" stopColor="#8aa0b5" />
          <stop offset="100%" stopColor="#4a6178" />
        </linearGradient>
      </defs>

      <rect width="1200" height="420" fill="url(#okbFwSky)" />

      <g className={reduce ? undefined : "okb-fw-cloud"} opacity="0.55">
        <ellipse cx="180" cy="58" rx="62" ry="18" fill="#ffffff" />
        <ellipse cx="220" cy="52" rx="40" ry="16" fill="#ffffff" />
        <ellipse cx="760" cy="42" rx="70" ry="16" fill="#ffffff" />
        <ellipse cx="810" cy="38" rx="36" ry="14" fill="#ffffff" />
      </g>

      <path
        d="M0 250 L70 170 L130 210 L190 110 L250 190 L310 150 L360 230 L360 420 L0 420 Z"
        fill="url(#okbFwPeak)"
      />
      <path d="M190 110 L214 154 L168 158 Z" fill="#f4f8fb" opacity="0.85" />

      <path
        d="M280 250 C340 210 390 200 460 230 C510 250 560 240 620 255 L620 420 L280 420 Z"
        fill="url(#okbFwHill)"
      />
      <g fill="#164a28">
        <ellipse cx="360" cy="248" rx="18" ry="28" />
        <ellipse cx="400" cy="238" rx="16" ry="32" />
        <ellipse cx="440" cy="246" rx="20" ry="30" />
        <ellipse cx="490" cy="252" rx="15" ry="26" />
        <ellipse cx="530" cy="244" rx="17" ry="29" />
      </g>

      <path
        d="M560 300 C640 270 720 290 790 275 C850 262 910 280 960 270 L960 420 L560 420 Z"
        fill="#c9b07a"
      />
      <path
        d="M760 268 C800 258 860 262 910 250 L930 280 C880 286 820 284 770 292 Z"
        fill="#a8c96a"
      />

      <g>
        <rect x="640" y="236" width="22" height="52" fill="#dce4ee" />
        <rect x="668" y="214" width="26" height="74" fill="#f4f7fb" />
        <rect x="700" y="228" width="20" height="60" fill="#d7e0ea" />
        <rect x="726" y="206" width="30" height="82" fill="#eef3f8" />
        <rect x="640" y="228" width="8" height="8" fill="#f57e20" />
        <rect x="674" y="222" width="8" height="8" fill="#0038a8" />
        <rect x="732" y="214" width="8" height="8" fill="#f57e20" />
      </g>

      <path d="M930 270 C980 255 1040 268 1200 250 L1200 420 L930 420 Z" fill="url(#okbFwSea)" />

      <g className={reduce ? undefined : "okb-fw-reef"} fill="#1fa37a" opacity="0.9">
        <path d="M1020 360 q12 -28 24 0 q-12 10 -24 0" />
        <path d="M1060 372 q10 -22 20 0 q-10 8 -20 0" />
        <path d="M1108 354 q14 -32 28 0 q-14 12 -28 0" />
        <path d="M1152 368 q9 -20 18 0 q-9 8 -18 0" />
      </g>

      <path
        d="M214 154 C260 200 300 230 360 250 C430 274 500 268 560 292 C640 318 720 300 800 318 C880 336 980 312 1200 300"
        fill="none"
        stroke="url(#okbFwRiver)"
        strokeWidth="16"
        strokeLinecap="round"
        className={reduce ? undefined : "okb-fw-river"}
      />
      <path
        d="M214 154 C260 200 300 230 360 250 C430 274 500 268 560 292 C640 318 720 300 800 318 C880 336 980 312 1200 300"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="10 18"
        opacity="0.55"
        className={reduce ? undefined : "okb-fw-current"}
      />

      <g fill="#0038a8" fontFamily="inherit" fontWeight="700" fontSize="13" letterSpacing="0.08em">
        <text x="150" y="400">RIDGE</text>
        <text x="430" y="400">WATERSHED</text>
        <text x="690" y="400">FLOODPLAIN</text>
        <text x="1040" y="400" fill="#ffffff">
          REEF
        </text>
      </g>
    </svg>
  );
}
