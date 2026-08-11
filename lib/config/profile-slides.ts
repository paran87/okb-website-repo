export interface ProfileSlide {
  id: number;
  src: string;
  title: string;
  caption: string;
}

/** Oplan Kontra Baha portfolio slides (from Canva export). */
export const PROFILE_SLIDES: readonly ProfileSlide[] = [
  {
    id: 1,
    src: "/portfolio/slide-01.png",
    title: "A Whole-of-Nation Approach",
    caption: "Oplan Kontra Baha program overview — November 2025 to July 2026",
  },
  {
    id: 2,
    src: "/portfolio/slide-02.png",
    title: "Flood Control Concept",
    caption: "Short-term and long-term flood control strategies",
  },
  {
    id: 3,
    src: "/portfolio/slide-03.png",
    title: "Flood Mitigation Activities",
    caption: "Debris clearing and obstruction removal along waterways",
  },
  {
    id: 4,
    src: "/portfolio/slide-04.png",
    title: "What is Oplan Kontra Baha?",
    caption: "Program launch and mission overview",
  },
  {
    id: 5,
    src: "/portfolio/slide-05.png",
    title: "Greater Metro Manila Flooding",
    caption: "Challenges and proposed solutions",
  },
  {
    id: 6,
    src: "/portfolio/slide-06.png",
    title: "Whole of Nation Approach",
    caption: "Inter-agency support and partner organizations",
  },
  {
    id: 7,
    src: "/portfolio/slide-07.png",
    title: "Dredging & Pumping Stations",
    caption: "River capacity and floodwater management",
  },
  {
    id: 8,
    src: "/portfolio/slide-08.png",
    title: "Metro Manila Launch",
    caption: "November 12, 2025 — Greater Metro Manila waterways",
  },
  {
    id: 9,
    src: "/portfolio/slide-09.png",
    title: "Nationwide Effort",
    caption: "Waterway rehabilitation across the Philippines",
  },
  {
    id: 10,
    src: "/portfolio/slide-10.png",
    title: "Bacolod City Launch",
    caption: "December 12, 2025 — Mambuloc Creek operations",
  },
  {
    id: 11,
    src: "/portfolio/slide-11.png",
    title: "Metro Cebu Launch",
    caption: "November 21, 2025 — Mahiga Creek operations",
  },
  {
    id: 12,
    src: "/portfolio/slide-12.png",
    title: "Where Are We Now?",
    caption: "Launched areas and soft-launch operations",
  },
  {
    id: 13,
    src: "/portfolio/slide-13.png",
    title: "Iloilo City Launch",
    caption: "May 19, 2026 — Jaro River rehabilitation",
  },
  {
    id: 14,
    src: "/portfolio/slide-14.png",
    title: "NCR Activities — North & South Manila / QC",
    caption: "District engineering office rehabilitation works",
  },
  {
    id: 15,
    src: "/portfolio/slide-15.png",
    title: "NCR Activities — Las Piñas-Muntinlupa / Malabon-Navotas",
    caption: "Before, during, and after clearing operations",
  },
  {
    id: 16,
    src: "/portfolio/slide-16.png",
    title: "NCR Activities — Metro Manila Districts",
    caption: "Debris clearing and vegetation removal",
  },
  {
    id: 17,
    src: "/portfolio/slide-17.png",
    title: "Program Portfolio",
    caption: "Oplan Kontra Baha field operations",
  },
  {
    id: 18,
    src: "/portfolio/slide-18.png",
    title: "Program Portfolio",
    caption: "Oplan Kontra Baha field operations",
  },
  {
    id: 19,
    src: "/portfolio/slide-19.png",
    title: "Program Portfolio",
    caption: "Oplan Kontra Baha field operations",
  },
  {
    id: 20,
    src: "/portfolio/slide-20.png",
    title: "Program Portfolio",
    caption: "Oplan Kontra Baha field operations",
  },
] as const;
