"use client";

import { useState } from "react";
import { useReducedMotion } from "framer-motion";
import { RIDGE_TO_REEF_ZONES } from "@/lib/config/okb-framework";
import { cn } from "@/utils/cn";

/** Horizontal extent of each zone in the scene, plus its marker position. */
const ZONE_BANDS = [
  { x: 0, width: 250, pin: { x: 10.5, y: 41 } },
  { x: 250, width: 220, pin: { x: 30, y: 58 } },
  { x: 470, width: 320, pin: { x: 52.5, y: 54 } },
  { x: 790, width: 160, pin: { x: 72.5, y: 67 } },
  { x: 950, width: 250, pin: { x: 89.5, y: 77 } },
] as const;

const TREES = [
  { x: 232, y: 302 },
  { x: 272, y: 292 },
  { x: 312, y: 290 },
  { x: 352, y: 298 },
  { x: 396, y: 308 },
  { x: 440, y: 317 },
  { x: 486, y: 323 },
  { x: 542, y: 329 },
] as const;

const RAIN = [136, 152, 168, 184, 200, 216] as const;

/** Interactive ridge-to-reef traverse — the hydrologic continuum OKB works across. */
export function FrameworkRidgeToReef() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const zone = RIDGE_TO_REEF_ZONES[active]!;
  const anim = (name: string) => (reduce ? undefined : name);

  return (
    <figure className="okb-r2r">
      <div className="okb-r2r-stage">
        <svg viewBox="0 0 1200 520" className="okb-r2r-svg" aria-hidden focusable="false">
          <defs>
            <linearGradient id="okbR2rSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#07254a" />
              <stop offset="40%" stopColor="#2f6aa8" />
              <stop offset="74%" stopColor="#9cc6e6" />
              <stop offset="100%" stopColor="#f8d6a8" />
            </linearGradient>
            <radialGradient id="okbR2rSun" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff6e2" />
              <stop offset="60%" stopColor="#ffcf87" />
              <stop offset="100%" stopColor="#f9a94f" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="okbR2rFar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5b81ad" />
              <stop offset="100%" stopColor="#33547d" />
            </linearGradient>
            <linearGradient id="okbR2rRidge" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#93aec7" />
              <stop offset="45%" stopColor="#5c7a99" />
              <stop offset="100%" stopColor="#2f4a68" />
            </linearGradient>
            <linearGradient id="okbR2rForest" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#358350" />
              <stop offset="100%" stopColor="#14472a" />
            </linearGradient>
            <linearGradient id="okbR2rPlain" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d3bd88" />
              <stop offset="100%" stopColor="#93815a" />
            </linearGradient>
            <linearGradient id="okbR2rSea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3aa8da" />
              <stop offset="55%" stopColor="#12689f" />
              <stop offset="100%" stopColor="#03355c" />
            </linearGradient>
            <linearGradient id="okbR2rRiver" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8fdcf8" />
              <stop offset="55%" stopColor="#39a0dd" />
              <stop offset="100%" stopColor="#1d76bd" />
            </linearGradient>
            <linearGradient id="okbR2rHaze" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.5" />
            </linearGradient>
            <radialGradient id="okbR2rSpotFade">
              <stop offset="0%" stopColor="#000000" />
              <stop offset="55%" stopColor="#000000" />
              <stop offset="100%" stopColor="#ffffff" />
            </radialGradient>
            <mask id="okbR2rSpot">
              <rect width="1200" height="520" fill="#ffffff" />
              <ellipse
                cx={ZONE_BANDS[active]!.x + ZONE_BANDS[active]!.width / 2}
                cy="290"
                rx="250"
                ry="400"
                fill="url(#okbR2rSpotFade)"
                className="okb-r2r-spot"
              />
            </mask>
          </defs>

          <rect width="1200" height="520" fill="url(#okbR2rSky)" />

          <circle
            cx="1052"
            cy="112"
            r="78"
            fill="url(#okbR2rSun)"
            className={anim("okb-r2r-sun")}
          />
          <circle cx="1052" cy="112" r="26" fill="#fff3dc" opacity="0.92" />

          <g className={anim("okb-r2r-cloud-a")} opacity="0.5" fill="#ffffff">
            <ellipse cx="322" cy="96" rx="66" ry="17" />
            <ellipse cx="366" cy="88" rx="42" ry="15" />
          </g>
          <g className={anim("okb-r2r-cloud-b")} opacity="0.38" fill="#ffffff">
            <ellipse cx="792" cy="72" rx="74" ry="15" />
            <ellipse cx="836" cy="66" rx="40" ry="13" />
          </g>

          <path
            d="M0 306 L110 214 L188 262 L286 180 L372 258 L470 206 L560 272 L668 232 L760 286 L880 250 L1200 300 L1200 520 L0 520 Z"
            fill="url(#okbR2rFar)"
            opacity="0.5"
          />

          <path
            d="M0 520 L0 268 L74 178 L152 96 L212 176 L268 132 L330 214 L392 288 L392 520 Z"
            fill="url(#okbR2rRidge)"
          />
          <path d="M152 96 L186 142 L118 142 Z" fill="#eef5fb" />
          <path d="M268 132 L292 166 L244 166 Z" fill="#eef5fb" opacity="0.85" />

          <g opacity="0.85">
            <ellipse cx="168" cy="60" rx="52" ry="16" fill="#6c7f95" />
            <ellipse cx="200" cy="54" rx="32" ry="13" fill="#7b8ea4" />
            <g className={anim("okb-r2r-rain")} stroke="#cfe7f7" strokeWidth="2" strokeLinecap="round">
              {RAIN.map((x) => (
                <line key={x} x1={x} y1="78" x2={x - 5} y2="98" />
              ))}
            </g>
          </g>

          <rect x="0" y="238" width="1200" height="86" fill="url(#okbR2rHaze)" opacity="0.35" />

          <path
            d="M92 520 L150 336 C238 280 330 272 420 306 C486 331 548 322 612 338 L612 520 Z"
            fill="url(#okbR2rForest)"
          />
          <g fill="#0f3c23">
            {TREES.map((tree) => (
              <path
                key={tree.x}
                d={`M${tree.x} ${tree.y - 28} L${tree.x + 12} ${tree.y + 4} L${tree.x - 12} ${tree.y + 4} Z`}
              />
            ))}
          </g>

          <path
            d="M352 520 L420 372 C540 344 660 356 782 346 C842 341 886 352 926 362 L926 520 Z"
            fill="url(#okbR2rPlain)"
          />
          <path
            d="M462 392 C556 370 648 378 744 366 L762 398 C664 410 566 404 482 420 Z"
            fill="#8fb861"
            opacity="0.8"
          />

          <g>
            <rect x="590" y="318" width="26" height="50" fill="#dbe3ed" />
            <rect x="622" y="298" width="30" height="70" fill="#f2f6fa" />
            <rect x="658" y="326" width="22" height="42" fill="#d2dbe6" />
            <rect x="686" y="288" width="34" height="80" fill="#eef3f9" />
            <rect x="726" y="312" width="26" height="56" fill="#dbe3ed" />
            <g fill="#0038a8" opacity="0.65">
              <rect x="596" y="326" width="6" height="6" />
              <rect x="630" y="308" width="6" height="6" />
              <rect x="694" y="298" width="6" height="6" />
              <rect x="732" y="322" width="6" height="6" />
            </g>
            <rect x="606" y="310" width="6" height="6" fill="#f57e20" />
            <rect x="706" y="316" width="6" height="6" fill="#f57e20" />
          </g>

          <g>
            <rect x="782" y="334" width="58" height="34" rx="3" fill="#e9eff6" />
            <rect x="782" y="328" width="58" height="8" rx="2" fill="#0038a8" opacity="0.75" />
            <rect x="798" y="346" width="12" height="12" fill="#0038a8" opacity="0.35" />
            <rect x="818" y="346" width="12" height="12" fill="#0038a8" opacity="0.35" />
            <rect x="836" y="358" width="26" height="7" rx="3" fill="#b9c6d4" />
            <g className={anim("okb-r2r-pump")} fill="#8fdcf8">
              <ellipse cx="868" cy="370" rx="9" ry="4" />
              <ellipse cx="880" cy="378" rx="6" ry="3" opacity="0.7" />
            </g>
          </g>

          <path
            d="M900 372 C980 360 1082 366 1200 354 L1200 520 L866 520 Z"
            fill="url(#okbR2rSea)"
          />

          <path
            d="M152 132 C176 210 214 258 268 296 C324 336 386 336 448 362 C512 389 578 378 646 392 C716 406 786 394 856 404 C886 409 900 406 916 398"
            fill="none"
            stroke="url(#okbR2rRiver)"
            strokeWidth="15"
            strokeLinecap="round"
          />
          <path
            d="M152 132 C176 210 214 258 268 296 C324 336 386 336 448 362 C512 389 578 378 646 392 C716 406 786 394 856 404 C886 409 900 406 916 398"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.6"
            className={anim("okb-r2r-flow")}
          />
          <ellipse cx="952" cy="396" rx="62" ry="15" fill="#79c0e0" opacity="0.42" />

          <g className={anim("okb-r2r-barge")}>
            <rect x="470" y="372" width="54" height="12" rx="3" fill="#f57e20" />
            <rect x="486" y="354" width="16" height="18" rx="2" fill="#d96a12" />
            <path d="M500 356 L528 342 L534 350 L508 364 Z" fill="#ffb066" />
          </g>

          <g stroke="#f57e20" strokeWidth="3" strokeLinecap="round">
            <line x1="806" y1="386" x2="834" y2="400" />
          </g>
          <g fill="#f57e20">
            <circle cx="806" cy="386" r="4" />
            <circle cx="820" cy="393" r="4" />
            <circle cx="834" cy="400" r="4" />
          </g>

          <g fill="#1f6b45">
            <ellipse cx="862" cy="382" rx="16" ry="11" />
            <ellipse cx="886" cy="388" rx="13" ry="9" />
            <ellipse cx="842" cy="390" rx="11" ry="8" />
          </g>

          <g
            className={anim("okb-r2r-shimmer")}
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.32"
          >
            <path d="M918 400 C996 394 1084 398 1198 390" />
            <path d="M938 428 C1016 422 1104 426 1198 418" />
            <path d="M958 456 C1036 450 1126 454 1198 446" />
          </g>

          <g fill="#1fa37a" opacity="0.92">
            <path d="M1002 480 q14 -34 28 0 q-14 12 -28 0" />
            <path d="M1046 490 q11 -26 22 0 q-11 10 -22 0" />
            <path d="M1094 474 q16 -38 32 0 q-16 14 -32 0" />
            <path d="M1146 488 q10 -24 20 0 q-10 10 -20 0" />
          </g>
          <g fill="#4fd6ac" opacity="0.7">
            <circle cx="1028" cy="500" r="5" />
            <circle cx="1076" cy="506" r="4" />
            <circle cx="1128" cy="498" r="5" />
          </g>

          <g
            className={anim("okb-r2r-bird")}
            fill="none"
            stroke="#0b2f52"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.5"
          >
            <path d="M556 150 q8 -7 16 0" />
            <path d="M584 138 q7 -6 14 0" />
          </g>

          <rect
            width="1200"
            height="520"
            fill="#00142b"
            opacity="0.46"
            mask="url(#okbR2rSpot)"
          />

          {ZONE_BANDS.map((band, index) => (
            <rect
              key={RIDGE_TO_REEF_ZONES[index]!.id}
              x={band.x}
              y="510"
              width={band.width}
              height="10"
              fill="#f57e20"
              className="okb-r2r-dim"
              opacity={index === active ? 1 : 0.12}
            />
          ))}
        </svg>

        {ZONE_BANDS.map((band, index) => {
          const item = RIDGE_TO_REEF_ZONES[index]!;
          const selected = index === active;
          return (
            <button
              key={item.id}
              type="button"
              style={{ left: `${band.pin.x}%`, top: `${band.pin.y}%` }}
              className={cn("okb-r2r-pin", selected && "okb-r2r-pin--on")}
              onClick={() => setActive(index)}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              aria-pressed={selected}
            >
              <span aria-hidden>{index + 1}</span>
              <span className="sr-only">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="okb-r2r-panel">
        <div className="okb-r2r-legend">
          {RIDGE_TO_REEF_ZONES.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={cn("okb-r2r-chip", index === active && "okb-r2r-chip--on")}
              onClick={() => setActive(index)}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              aria-pressed={index === active}
            >
              <span className="okb-r2r-chip-num" aria-hidden>
                {index + 1}
              </span>
              <span>
                <span className="okb-r2r-chip-label">{item.label}</span>
                <span className="okb-r2r-chip-lead">{item.lead}</span>
              </span>
            </button>
          ))}
        </div>
        <figcaption className="okb-r2r-caption">{zone.body}</figcaption>
      </div>
    </figure>
  );
}
