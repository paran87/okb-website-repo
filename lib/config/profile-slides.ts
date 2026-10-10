export interface ProfileSlide {
  id: number;
  src: string;
  title: string;
  caption: string;
}

/** Oplan Kontra Baha portfolio slides (from Canva export); each title and caption describes its own image. */
export const PROFILE_SLIDES: readonly ProfileSlide[] = [
  {
    id: 1,
    src: "/portfolio/slide-01.png",
    title: "Oplan Kontra Baha",
    caption: "A whole-of-nation approach — November 12, 2025 to July 26, 2026",
  },
  {
    id: 2,
    src: "/portfolio/slide-02.png",
    title: "Featured Contents",
    caption: "Sections of the Oplan Kontra Baha portfolio",
  },
  {
    id: 3,
    src: "/portfolio/slide-03.png",
    title: "Oplan Kontra Baha Task Force",
    caption: "Sec. Vivencio B. Dizon, Usec. Charles T. Calima Jr. and Dir. Toribio Noel L. Ilao",
  },
  {
    id: 4,
    src: "/portfolio/slide-04.png",
    title: "Task Force Commander",
    caption: "Usec. Charles T. Calima Jr., DPWH Undersecretary for Special Concerns",
  },
  {
    id: 5,
    src: "/portfolio/slide-05.png",
    title: "Issuances",
    caption: "Presidential Directive No. PBBM-2025-1777-1780 and Special Order No. 6, Series of 2026",
  },
  {
    id: 6,
    src: "/portfolio/slide-06.png",
    title: "What is Oplan Kontra Baha?",
    caption: "A short-term program of immediate, practical interventions against flooding",
  },
  {
    id: 7,
    src: "/portfolio/slide-07.png",
    title: "Flood Mitigation Activities",
    caption: "Clearing garbage and debris, and removing obstructions along waterways",
  },
  {
    id: 8,
    src: "/portfolio/slide-08.png",
    title: "Dredging & Pumping Stations",
    caption: "River dredging and the Sunog Apog and Valenzuela pumping stations",
  },
  {
    id: 9,
    src: "/portfolio/slide-09.png",
    title: "Flood Control Concept",
    caption: "Short-term and long-term flood control measures",
  },
  {
    id: 10,
    src: "/portfolio/slide-10.png",
    title: "Greater Metro Manila Flooding",
    caption: "An overview of challenges and proposed solutions",
  },
  {
    id: 11,
    src: "/portfolio/slide-11.png",
    title: "A Nationwide Effort",
    caption: "Waterway rehabilitation and flood prevention activities across the regions",
  },
  {
    id: 12,
    src: "/portfolio/slide-12.png",
    title: "Inter-Agency Support",
    caption: "Whole-of-nation approach: partner agencies and the private sector",
  },
  {
    id: 13,
    src: "/portfolio/slide-13.png",
    title: "Metro Manila Launch",
    caption: "November 12, 2025 — Balihatar Creek, Parañaque City",
  },
  {
    id: 14,
    src: "/portfolio/slide-14.png",
    title: "Metro Cebu Launch",
    caption: "November 21, 2025 — Mahiga Creek, Cebu City and Mandaue City",
  },
  {
    id: 15,
    src: "/portfolio/slide-15.png",
    title: "Bacolod City Launch",
    caption: "December 12, 2025 — Mambuloc Creek, Barangay 2",
  },
  {
    id: 16,
    src: "/portfolio/slide-16.png",
    title: "Iloilo City Launch",
    caption: "May 19, 2026 — Jaro River, Barangay Ticud, La Paz",
  },
  {
    id: 17,
    src: "/portfolio/slide-17.png",
    title: "Where Are We Now?",
    caption: "4 areas launched and 11 areas with operations started",
  },
  {
    id: 18,
    src: "/portfolio/slide-18.png",
    title: "NCR Waterway Maintenance",
    caption: "North Manila, South Manila, Quezon City 1st and 2nd District Engineering Offices — before, during and after",
  },
  {
    id: 19,
    src: "/portfolio/slide-19.png",
    title: "NCR Waterway Maintenance",
    caption: "Las Piñas–Muntinlupa and Malabon–Navotas District Engineering Offices — before, during and after",
  },
  {
    id: 20,
    src: "/portfolio/slide-20.png",
    title: "NCR Waterway Maintenance",
    caption: "Metro Manila 1st, 2nd and 3rd District Engineering Offices — before, during and after",
  },
] as const;
