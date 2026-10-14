/**
 * Content of the OKB briefer ("okb_briefer_2", Google Drive folder 1W8KVmZZHRiUlG2rggFSpO8R8Vv4rWdYV), shown on the
 * Home, About and Initiatives pages. Pictures are in public/okb-briefer/.
 */

export const OKB_DEFINITION = {
  filipino: {
    title: "Ano ang Oplan Kontra Baha (OKB)?",
    lines: [
      "Ang Oplan Kontra Baha (OKB) ay isang panandaliang programa ng pamahalaan.",
      "Layunin: siguraduhing may dadaluyan ang tubig baha.",
    ],
  },
  english:
    "Oplan Kontra Baha is a short-term government program with one goal: make sure floodwater always has somewhere to go.",
  examplesTitle: "Halimbawa · Examples",
  examples: [
    "Paglilinis ng mga basura na nagbabara sa drainage — clearing garbage that clogs the drainage",
    "Pagtanggal ng mga nakaharang sa daluyan ng tubig, partikular ang mga illegal structure — removing obstructions, especially illegal structures, from waterways",
    "Pagpapalalim o pagpapaluwag (dredging) ng mga ilog — deepening and widening rivers by dredging",
    "Pagsasaayos ng mga sirang pumping station — repairing damaged pumping stations",
  ],
} as const;

export const OKB_ISSUANCES = [
  { code: "PBBM-2025-1777-1780", kind: "Presidential Directive No." },
  { code: "PBBM-2026-2067-2070", kind: "Presidential Directive No." },
  { code: "No. 06, Series of 2026", kind: "DPWH Special Order" },
  { code: "No. 308, Series of 2026", kind: "DPWH Special Order" },
] as const;

export const OKB_MITIGATION = {
  shortTerm: [
    "Declogging of drainage canals and culverts",
    "Desilting and removal of garbage, debris, and vegetation in rivers and esteros",
    "Temporary repairs of damaged drainage lines and outfalls",
    "Pumping operations in flood-prone urban areas",
    "Emergency river dredging and channel opening",
  ],
  longTerm: [
    "Construction of dikes and floodwalls",
    "Development of floodways, diversion channels, dams, and retention/detention basins",
    "Comprehensive urban drainage master plans",
    "Construction of pumping stations and floodgates",
    "Construction of climate-resilient flood control infrastructure and monitoring systems",
  ],
} as const;

export const OKB_PARADIGM = {
  then: {
    label: "Then (before)",
    motto: "Build · Expand · Deliver",
    points: [
      "Emphasis on new flood control construction: more capital, an investment phase",
      "Progress measured by capital delivery",
      "Maintenance treated as secondary",
      "Gradual loss of system capacity due to siltation and obstruction",
    ],
  },
  now: {
    label: "Now (moving forward)",
    motto: "Maintain · Preserve · Restore",
    points: [
      "Equal focus on sustaining existing systems",
      "Operations and maintenance as core functions",
      "Keeping structures reliable is integral to asset management",
      "Restoration integrated into the asset lifecycle: an investment that is not maintained is an investment that fails",
      "New construction guided by system performance",
    ],
  },
} as const;

export const OKB_CHALLENGES = [
  { challenge: "Clogged drainage and poor stormwater flow", solution: "Declogging of drainage systems" },
  { challenge: "Silted and reduced flow of waterways", solution: "Cleaning and dredging of waterways" },
  { challenge: "Non-operational pumping stations", solution: "Ensuring operability of pumping stations and deployment of mobile pumps" },
  { challenge: "Infrastructure blockages along waterways", solution: "Clearing of illegal and unnecessary structures along waterways" },
  { challenge: "Poor waste management", solution: "Implementing and enforcing efficient waste management policies" },
] as const;

export const OKB_FLOW = [
  "Planning and preparation",
  "Oplan Kontra Baha launching",
  "Implementation",
  "Monitoring and impact assessment",
  "Sustain",
] as const;

export const OKB_LAUNCHINGS = [
  {
    place: "Greater Metro Manila",
    where: "Balihatar Creek, Parañaque City",
    date: "12 November 2025",
    image: "/okb-briefer/launch-manila.webp",
  },
  {
    place: "Metro Cebu",
    where: "Mandaue City and Cebu City",
    date: "21 November 2025",
    image: "/okb-briefer/launch-cebu.webp",
  },
  {
    place: "Bacolod City",
    where: "Mambuloc Creek, Barangay 2, Bacolod City",
    date: "12 December 2025",
    image: "/okb-briefer/launch-bacolod.webp",
  },
  {
    place: "Bicol (inspection)",
    where: "Sagop Creek, Barangay Triangulo, Naga City",
    date: "21 February 2026",
    image: "/okb-briefer/launch-naga.webp",
  },
] as const;

export const OKB_TASK_FORCE = [
  {
    name: "Sec. Vivencio B. Dizon",
    role: "Acting Secretary",
    office: "Department of Public Works and Highways",
    image: "/okb-briefer/dizon.webp",
  },
  {
    name: "PMGen Charles T. Calima, Jr. (Ret)",
    role: "Undersecretary for Special Concerns · Task Force Commander",
    office: "Oplan Kontra Baha",
    image: "/okb-briefer/calima.webp",
  },
  {
    name: "Dir. Toribio Noel L. Ilao",
    role: "Director IV, Bureau of Equipment · Chief of Staff",
    office: "OKB Task Force",
    image: "/okb-briefer/ilao.webp",
  },
] as const;

export const OKB_WHOLE_OF_NATION = {
  lead: "Pinangungunahan ito ng Department of Public Works and Highways (DPWH). The DPWH leads, with partners from every sector:",
  partners: [
    { who: "Other government agencies", detail: "DENR, MMDA, DHSUD, uniformed personnel, DSWD" },
    { who: "Local governments", detail: "Municipal, city or provincial government and district representatives" },
    { who: "Private sector", detail: "Through corporate social responsibility (CSR)" },
    { who: "Volunteers and communities", detail: "Volunteers, socio-civic organizations and concerned citizens" },
  ],
  privateSector: ["San Miguel Corporation", "Metro Pacific Tollways (MPTC)"],
  support: [
    "Manpower and equipment",
    "Manpower and financial assistance for informal settler families — MMC and the LGUs of Bulacan, Laguna, Cavite and Rizal",
    "Manpower through cash-for-work (the TUPAD program)",
    "Navy engineers, AFP reservists, PNP Mobile Force and PCG Auxiliary",
    "Relocation of informal settler families and waste disposal",
    "Vaccines and vitamins, first aid and ambulance, food and water",
    "Enforcement of the Clean Water Act",
    "Offshore spoils disposal — Philippine Ports Authority",
  ],
} as const;

export const OKB_PARTNERSHIPS = {
  nationalLocal: {
    title: "One mission, shared responsibility",
    subtitle: "National–local partnership for faster, safer and more effective operations",
    left: {
      label: "National government",
      items: ["Heavy equipment and technical personnel", "Project funding", "Engineering and technical support", "Monitoring and performance reporting"],
    },
    right: {
      label: "Local government units",
      items: [
        "Permits and regulatory clearances",
        "Security and safety equipment and personnel",
        "Access, right-of-way and disposal sites",
        "Local coordination and community support",
      ],
    },
    shared: ["Operational resources", "Work planning and scheduling", "Environmental compliance", "Risk and emergency management", "Transparent progress reporting"],
  },
  publicPrivate: {
    title: "Public leadership, private capability, shared results",
    subtitle: "Government–private sector partnership for faster and more efficient operations",
    left: {
      label: "Government",
      items: [
        "Permitting and regulatory facilitation",
        "Policy, standards and technical oversight",
        "Inter-agency and LGU coordination",
        "Project identification and prioritization",
        "Public accountability and compliance monitoring",
      ],
    },
    right: {
      label: "Private sector",
      items: [
        "Provision of additional equipment and resources",
        "Faster mobilization and deployment",
        "Specialized expertise and skilled manpower",
        "Innovative technologies and solutions",
        "Operations, maintenance and logistics support",
      ],
    },
    shared: ["Clear roles and coordinated work plans", "Safety and environmental compliance", "Transparent costing and performance monitoring", "Rapid issue resolution", "Public value and measurable results"],
  },
} as const;

/** Dredging equipment status from the briefer (51 units listed; the reporting date is not stated in the source). */
export const OKB_DREDGING_EQUIPMENT = {
  operating: 30,
  idle: 12,
  forRepair: 9,
  forDisposal: 0,
  total: 51,
  rows: [
    { type: "Amphibious excavators", operating: 23, idle: 5, forRepair: 4, forDisposal: 0, total: 32 },
    { type: "Cutter suction dredgers", operating: 4, idle: 0, forRepair: 0, forDisposal: 0, total: 4 },
    { type: "Multipurpose amphibious dredgers", operating: 2, idle: 0, forRepair: 2, forDisposal: 0, total: 4 },
    { type: "Support LBEs", operating: 0, idle: 7, forRepair: 2, forDisposal: 0, total: 9 },
    { type: "Support vessels", operating: 1, idle: 0, forRepair: 1, forDisposal: 0, total: 2 },
  ],
} as const;
