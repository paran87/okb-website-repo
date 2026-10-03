/**
 * The 18 major river basins from the DPWH "18 Major River Basin MP/FS" drive.
 * Order matches the numbered folders in that collection.
 */
export const MAJOR_RIVER_BASINS = [
  {
    number: 1,
    label: "Cagayan",
    slug: "cagayan",
    folderId: "1bDk8UslNuoPoB2LrAP_aWyO6-CvDJAhv",
  },
  {
    number: 2,
    label: "Mindanao",
    slug: "mindanao",
    folderId: "1v6cBH1L1JiDto_oBaxtK02FtHfU59SAs",
  },
  {
    number: 3,
    label: "Agusan",
    slug: "agusan",
    folderId: "1RwEsHoX_nRHyOZrN_7NRM7ZYWtTt64ga",
  },
  {
    number: 4,
    label: "Pampanga",
    slug: "pampanga",
    folderId: "1FQ-UvOOFaQNLQLw_n05UmkebvE8KoRcJ",
  },
  {
    number: 5,
    label: "Agno",
    slug: "agno",
    folderId: "1zH2lMFwtDCcu4awXeMYvBLDzAMKn2rry",
  },
  {
    number: 6,
    label: "Abra",
    slug: "abra",
    folderId: "1eOzTA_hYLGbxxBBiWQZdDfWypQl_D5AC",
  },
  {
    number: 7,
    label: "Pasig-Marikina",
    slug: "pasig-marikina",
    folderId: "1ohYGDcACbtvc3K_zN-FamfEUORUdQQl2",
  },
  {
    number: 8,
    label: "Bicol",
    slug: "bicol",
    folderId: "1ZBUcXoBt7Fx7IIAcQFfwPvVMQp4phgc7",
  },
  {
    number: 9,
    label: "Apayao-Abulug",
    slug: "apayao-abulug",
    folderId: "12GlHNcwIOxV5OF-S6rqUcqPqIiKLI141",
  },
  {
    number: 10,
    label: "Tagum-Libuganon",
    slug: "tagum-libuganon",
    folderId: "1gQziL1JyPt4uZU6Sh6nrdLNlDFzmFamc",
  },
  {
    number: 11,
    label: "Ilog-Hilabangan",
    slug: "ilog-hilabangan",
    folderId: "1NbDu-Ag6nTrykO3rFZycvJdJhzRCxYtn",
  },
  {
    number: 12,
    label: "Panay",
    slug: "panay",
    folderId: "1xSC85Byefpmqh6Ob_x119veUbyjpLHFm",
  },
  {
    number: 13,
    label: "Tagoloan",
    slug: "tagoloan",
    folderId: "1deUjlV2YdcXzJmTBZyIZPfDYCrJ8c5Ae",
  },
  {
    number: 14,
    label: "Ranao (Agus)",
    slug: "ranao-agus",
    folderId: "18b_O6k4xwAUoKf7y4y6lfQvQUbD5Uw08",
  },
  {
    number: 15,
    label: "Davao",
    slug: "davao",
    folderId: "1XEutyljZLRMZi_uwJRQdUG2_z3eNuwX0",
  },
  {
    number: 16,
    label: "Cagayan de Oro",
    slug: "cagayan-de-oro",
    folderId: "1VrD8idE88ntcCacjWbQ9Yd8pdPNgT0Y1",
  },
  {
    number: 17,
    label: "Jalaur",
    slug: "jalaur",
    folderId: "18SsnNHukOrnmyKuD7wY7_oUBnbYl_Wr5",
  },
  {
    number: 18,
    label: "Buayan-Malungon",
    slug: "buayan-malungon",
    folderId: "1LhpODF1w7dzWOj_R_3RZC5Ly-_wYf4b2",
  },
] as const;

export type MajorRiverBasin = (typeof MAJOR_RIVER_BASINS)[number];

export function getRiverBasin(slug: string): MajorRiverBasin | undefined {
  return MAJOR_RIVER_BASINS.find((basin) => basin.slug === slug);
}

export function riverBasinFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

/** Public folder listing Google allows other sites to frame. */
export function riverBasinEmbedUrl(folderId: string): string {
  return `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
}
