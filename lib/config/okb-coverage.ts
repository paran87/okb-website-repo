/**
 * Where Oplan Kontra Baha works: the waterways (dredging and desilting) and drainage lines (declogging) in the
 * OKB accomplishment reports of October 8, 2026, by region and province / city.
 *
 * Only the coverage is kept here: names and places. Volumes, statuses and percentages change daily and are shown
 * live on the Accomplishment dashboard, never copied into the website.
 */

export const COVERAGE_AS_OF = "October 8, 2026";

export interface CoverageArea {
  /** Province, city or metro area as the reports group it. */
  name: string;
  waterways?: readonly string[];
  /** Waterways the report counts for the area without naming them. */
  unlistedWaterways?: number;
  drainage?: readonly string[];
}

export interface CoverageRegion {
  id: string;
  /** "NCR", "Region I" … */
  code: string;
  name: string;
  areas: readonly CoverageArea[];
}

export const COVERAGE: readonly CoverageRegion[] = [
  {
    id: "ncr",
    code: "NCR",
    name: "National Capital Region",
    areas: [
      {
        name: "Metro Manila",
        waterways: [
          "Balihatar Creek", "Balisampan Creek", "Bayanan River", "Buhangin Creek", "Caingin Creek", "Calatagan Creek",
          "Canumay Creek", "Casili Creek", "Culiat Creek", "Dario Creek", "Diliman Creek", "Don Galo River",
          "Ermitaño Creek", "Estero de Balete", "Estero de Maypajo", "Estero de Paco", "Estero de Sampaloc",
          "Estero de San Lazaro", "Estero de Sunog Apog", "Estero de Tripa de Galina", "Estero de Tutuban",
          "Estero de Valencia", "Estero de Vitas", "Ibayo-Tipaz Creek", "Iglesia ni Cristo Creek", "Ilang Ilang Creek",
          "Ilugin River", "Kamias Creek", "Lagarian Creek", "Las Piñas River", "Letre Creek", "Magdaong Creek",
          "Maligaya Creek", "Manggahan Floodway", "Mapulang Lupa Creek", "Mariblo Creek", "Maricaban Creek",
          "Marikina River", "Marilao River", "Meycauayan River", "Nangka River", "Navotas River",
          "Navotas-Malabon River", "Parañaque River", "Parañaque River Mouth", "Pasig River", "Pasong Tamo Creek",
          "Pateros River", "Pioneer Creek", "Poblacion Creek", "San Dionisio Creek", "San Francisco River",
          "San Jose Creek", "San Juan River", "Sansi 2", "Santulan / Polo River", "Sapang Buli", "Sapang Malapit",
          "Sapang Pa-Hilaga", "Taguig River", "Talayan Creek", "Tangue Creek", "Tanigue Creek", "Tipas River",
          "Torcillo Creek", "Tullahan River", "Viente Reales Creek", "Villanueva Creek", "Wack Wack Creek",
          "Zapote River",
        ],
        drainage: [
          "BASECO", "Box culvert along Quezon Avenue", "C-3 Road", "Central Avenue and Visayas Avenue",
          "Fort Bonifacio–Nichols Field Road (Southern Police District)", "Gov. T. Santiago Street", "MacArthur Highway",
          "Maharlika Highway (Muntinlupa City)", "Marcos Alvarez Road", "Mindanao Avenue", "Polo–Novaliches Road",
          "West Avenue and Quezon Avenue (to Mariblo Creek)", "Zapote–Alabang Road (Las Piñas City)",
          "G. Araneta Avenue and Maria Clara Street", "Gil Puyat Avenue (cor. Washington)",
          "Ninoy Aquino Avenue SB (Medina – A. Bonifacio)", "Parañaque–Sucat Road (Brgy. Village to Sampaloc Site II)",
          "Parañaque–Sucat Road (Evacom – Kaybuboy Creek)", "Parañaque–Sucat Road (PNHS – SM Sucat)",
          "SSH Southbound (Emilia – Faraday)", "Amang Rodriguez Avenue", "Boni Avenue (F. Ortigas)",
          "Boni Avenue (Maysilo Circle)", "Buendia", "C-5 Katipunan", "Commonwealth Avenue", "E. Rodriguez Street",
          "Gov. W. Pascual Avenue", "Imelda Avenue", "Kalaw Avenue", "Loyola Street", "M.H. del Pilar Street",
          "Mabolo Street", "Manila East Road (Doña Juliana Village to Countryside)",
          "Manila East Road (Riverside Drive to SM East Ortigas)", "Mother Ignacia Street (Sgt. Esguerra to EDSA)",
          "Mother Ignacia Street (Timog Avenue to Sct. Madriñan)", "Panay Avenue (Sct. Albano to Sgt. Esguerra)",
          "Quezon Avenue (Banawe to Tuayan Street)", "San Francisco Street (San Francisco Drainage Interceptor)",
          "San Venancio Street, San Juan City", "Sct. Albano (Quezon Avenue to Panay Avenue)",
          "Sgt. Esguerra (Panay Avenue to Mother Ignacia)", "Sumulong Highway (Sumulong Drainage Interceptor)",
          "Taft Avenue NB (P. Faura – U.N. Avenue)", "Taft Avenue SB (U.N. Avenue – P. Gil)",
          "Timog Avenue (Quezon Avenue to Sct. Tuazon)", "Victory Avenue (Quezon Avenue to G. Araneta Avenue)",
          "Blumentritt", "España Boulevard", "Tayuman Street",
        ],
      },
    ],
  },
  {
    id: "r1",
    code: "Region I",
    name: "Ilocos Region",
    areas: [
      { name: "Ilocos", waterways: ["Govantes River"] },
      { name: "La Union", waterways: ["Ili Sur Creek"] },
      {
        name: "Pangasinan",
        waterways: [
          "Capaoay–San Vicente–Magsaysay Creek (San Jacinto)", "Samat–Asinan (Bugallon)", "Samat–Magtaquing (Bugallon)",
          "Sinucalan River",
        ],
        drainage: [
          "Judge Jose de Venecia Sr. Avenue (Dagupan City)", "Tarlac Road (Aguilar)", "Tarlac Road (Mangatarem)",
          "Urdaneta Jct. – Dagupan – Lingayen via Tarlac Road (Dagupan City)",
          "Urdaneta Jct. – Dagupan – Lingayen via Zambales Road (Dagupan City)",
        ],
      },
    ],
  },
  {
    id: "r2",
    code: "Region II",
    name: "Cagayan Valley",
    areas: [
      {
        name: "Tuguegarao",
        waterways: [
          "Annafunan Creek", "Balzain–Caritan Creek", "Cagayan River Confluence", "Carig Creek", "Carig Creek 2",
          "Pinacanauan River", "Puente de Atulayan Relic Bridge",
        ],
        drainage: ["Centro 11 Drainage"],
      },
    ],
  },
  {
    id: "r3",
    code: "Region III",
    name: "Central Luzon",
    areas: [
      {
        name: "Bataan",
        waterways: ["Amo River"],
        drainage: [
          "Gov. J. J. Linao Road", "Jct. Layac–Balanga–Mariveles Port Road (S01294LZ)",
          "Jct. Layac–Balanga–Mariveles Port Road (S01302LZ)", "Mt. Samat Road", "Roman Expressway",
        ],
      },
      { name: "Bulacan", unlistedWaterways: 1 },
      { name: "Pampanga", waterways: ["Pampanga River", "Pampanga River – Macabebe", "Pampanga River Mouth"] },
      { name: "Tarlac", waterways: ["Baka River", "Cadanan Creek"] },
    ],
  },
  {
    id: "r4a",
    code: "Region IV-A",
    name: "CALABARZON",
    areas: [
      { name: "Batangas", waterways: ["Manghinao River", "Marjoya River, Batangas City", "Takad River, Batangas City"] },
      { name: "Cavite", unlistedWaterways: 9 },
    ],
  },
  {
    id: "r5",
    code: "Region V",
    name: "Bicol Region",
    areas: [
      {
        name: "Camarines Sur",
        waterways: [
          "Abocado–Dayangdang Creek", "Baao Lake", "Baao Outlet 1 – Tan-agan Creek", "Baao Outlet 2", "Baao Outlet 3",
          "Balagbag Creek", "Balayan Creek", "Bato Lake", "Bicol River Cut-off Channel", "Bicol River Esplanade",
          "Bicol–Libmanan River Mouth", "Bigaan River and Malubago Creek", "Capucnasan (Almeda Mabolo By-pass) Creek",
          "Dinaga–Canaman Creek (Sulong Creek)", "Igamot Creek", "Libmanan River", "Makabalo River",
          "Mangayawan Creek", "Matiway Creek", "Milaor Creek", "Naga River", "Oas Creek",
          "Old Creek Bombon (Sto. Domingo portion)", "Old Spanish Creek (Dominorog portion)",
          "Old Spanish Creek (Poblacion portion)", "Pawili River", "Quipayo – Calabanga Creek", "Rangas River",
          "Sagop Creek", "Sinibaan Creek", "Sipocot River", "Tugos–Piot", "Yabu River",
        ],
        drainage: [
          "Bombon–San Roque Main Drainage", "Fraternidad Biak na Bato Drainage", "Irrigation Canal, Villa Karangahan",
          "Julian B. Meliton Elementary School (to Sagop Creek)", "Magsaysay Creek",
          "Naga–Carolina–Panicuason Open Canal", "Panganiban Road Drainage", "Sagop Creek (box culvert, Robinsons)",
          "Sagop Creek (Sitio Magayagaya, near Villa Rosita Hospital)", "Triangulo Creek",
        ],
      },
      { name: "Catanduanes", unlistedWaterways: 1 },
      { name: "Sorsogon", unlistedWaterways: 1 },
    ],
  },
  {
    id: "r6",
    code: "Region VI",
    name: "Western Visayas",
    areas: [
      { name: "Antique", waterways: ["Bacalan River", "Bacong River"] },
      {
        name: "Iloilo City",
        waterways: [
          "Batiano River", "Buntatala Creek", "Dungon Creek", "Iloilo–Batiano River", "Rizal Creek",
          "Rizal Creek, Iloilo City", "Tigum River",
        ],
        drainage: ["Iznart–Ledesma–Molo Road", "La Paz–Jaro Road", "La Paz–La Granja Road"],
      },
      {
        name: "Roxas, Capiz",
        waterways: ["Agbanban Creek", "Bolo–Pinaypan Ditch", "Pueblo Creek, Lawa-an"],
        drainage: [
          "Alcazart Street", "Beside DPWH 1st DEO Compound, Brgy. XI", "Brgy. Lawa-an", "Datiles Street, Brgy. Tiza",
          "Iloilo East Coast–Capiz Road", "Iloilo–Capiz Road (new route)", "Iloilo–Capiz Road, Pueblo to JY Hardware",
          "Iloilo–Capiz Road, Toyota to Bolo Brgy. Hall", "Lanot–Loctugan–Panitan Bdry. Road (Lanot to Quiabog Bridge)",
          "Roxas City Bdry. – Panitan–Bailan Road", "Roxas City–Cagay–Sibaguan–Balijuagan–Cudian–Ivisan Road",
        ],
      },
    ],
  },
  {
    id: "nir",
    code: "NIR",
    name: "Negros Island Region",
    areas: [
      {
        name: "Bacolod",
        waterways: [
          "Banago Creek", "Cabacawan Creek", "Cabalagnan Creek", "Kabiguan Creek", "Luhod-Luhod Creek", "Lupit River",
          "Magsungay River", "Mambuloc Creek", "Mandalagan River", "Maupay Creek", "Ngalan River", "Pahanocoy Creek",
          "Pequinto", "Pulo Creek", "Santa Clara River – Amugod Creek", "Sulom Creek", "Sum-ag River", "Tangub Creek",
          "Vito Creek",
        ],
        drainage: [
          "Alunan Avenue", "Bacolod Circumferential Road (North)", "Bacolod Circumferential Road (South)",
          "Bacolod City Boundary Road", "Bacolod North Road", "Bacolod–San Carlos Road", "Bacolod South Road",
          "Bacolod–Silay Access Road", "Buri Road", "Cottage Road", "Hernaez Street", "Hilado Street",
          "La Salle Street", "Lacson Extension Street", "Lacson Street", "Lizares Avenue", "Lopez Jaena Street",
          "Luzuriaga Street", "Narra", "North Capitol Road", "Plaza Capitol Road", "Rizal Street", "Rodriguez Avenue",
          "Rosario Street", "Roxas Avenue", "San Sebastian", "South Capitol Road", "Sto. Niño–Banago Road (North)",
          "Sum-ag – Abuanan Road", "B.S. Aquino Drive", "Gatuslao Street",
        ],
      },
    ],
  },
  {
    id: "r7",
    code: "Region VII",
    name: "Central Visayas",
    areas: [
      {
        name: "Metro Cebu",
        waterways: [
          "Bulacao River", "Butuanon River", "Cansaga River", "Cotcot River", "Danao River", "Guadalupe River",
          "Jubay River", "Kamputhaw River", "Kinalumsan River", "Liloan Pluvial Wetland", "Mahiga Creek",
          "Mananga River", "Subangdaku River",
        ],
        drainage: [
          "Carcar – Barili Mantayupan Road", "Cebu North Hagnaya Wharf Road, Liloan",
          "Cebu North Hagnaya Wharf Road, Mandaue City", "Cebu South Coastal Road", "Cebu–Toledo Wharf Road",
          "Consolacion – Tayud – Liloan Road", "Mambaling Flyover", "Naga–Uling Road", "Natalio Bacalso Avenue",
          "Sogod – Tabuelan Road", "Tapal (Carcar)–Zaragosa–Olango–Aloguinsan", "U.N. Avenue Road",
        ],
      },
    ],
  },
  {
    id: "r10",
    code: "Region X",
    name: "Northern Mindanao",
    areas: [
      { name: "Bukidnon", waterways: ["Taganibong Creek"] },
      {
        name: "Cagayan de Oro City",
        waterways: [
          "Alae River", "Bitan-ag Creek", "Cugman River", "Iponan River", "Kauswagan–Bayabas Outfall",
          "Sapang Creek – drainage line along CDO National Highway (BCIR)",
        ],
        drainage: ["Brgy. Kauswagan"],
      },
      {
        name: "Iligan City",
        waterways: ["Mahayahay Creek", "Saranay Creek", "Tubod River"],
        drainage: ["Roxas Avenue, Iligan City", "Quezon Avenue, Brgy. Mahayahay"],
      },
    ],
  },
  {
    id: "r11",
    code: "Region XI",
    name: "Davao Region",
    areas: [{ name: "Davao", waterways: ["Talomo River"] }],
  },
  {
    id: "r12",
    code: "Region XII",
    name: "SOCCSKSARGEN",
    areas: [
      {
        name: "Maguindanao",
        waterways: [
          "Alip River", "Bual Creek", "Buluan River", "Damakling Creek", "Digal Creek", "Idtig Creek",
          "Kayupo – Upper Dilag Creek", "Lepak Creek", "Lower Siling Creek", "Clearing of water hyacinth",
          "Pagalad Creek", "Paglat Creek", "Pedtubo Creek", "Poblacion Creek, Maguindanao", "Sitio Linek Creek",
          "Talayan River", "Tinungolan Creek", "Upper Dilag – Lower Dilag Creek",
        ],
        drainage: ["Local roads 1", "Local roads 2", "Local roads 3", "National roads"],
      },
    ],
  },
  {
    id: "r13",
    code: "Region XIII",
    name: "Caraga",
    areas: [{ name: "Butuan", waterways: ["Eastbank Cut-off Channel, Baan Riverside, Butuan City"] }],
  },
];

export const areaWaterways = (a: CoverageArea) => (a.waterways?.length ?? 0) + (a.unlistedWaterways ?? 0);
export const areaDrainage = (a: CoverageArea) => a.drainage?.length ?? 0;
export const regionWaterways = (r: CoverageRegion) => r.areas.reduce((n, a) => n + areaWaterways(a), 0);
export const regionDrainage = (r: CoverageRegion) => r.areas.reduce((n, a) => n + areaDrainage(a), 0);

/** Totals for the figures on the home page and the footer. */
export const COVERAGE_TOTALS = {
  regions: COVERAGE.length,
  areas: COVERAGE.reduce((n, r) => n + r.areas.length, 0),
  waterways: COVERAGE.reduce((n, r) => n + regionWaterways(r), 0),
  drainage: COVERAGE.reduce((n, r) => n + regionDrainage(r), 0),
} as const;
