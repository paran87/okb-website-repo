/**
 * Videos of the public Google Drive folder (https://drive.google.com/drive/folders/17Dff3ytObRPiz8dOfeuYGhy5g1CW40xf)
 * shown in the Gallery → Videos tab, newest first. They play in Drive's embedded player, so the folder must stay
 * shared as "Anyone with the link". To add a video, copy its file id (the part after /file/d/ in its link).
 */
export interface GalleryDriveVideo {
  id: string;
  title: string;
  caption: string;
  /** Date of the file in the folder (YYYY-MM-DD). */
  date: string;
}

export const GALLERY_DRIVE_VIDEOS: readonly GalleryDriveVideo[] = [
  {
    id: "1G5PtQ3WpA3aU7067_oDYuOsllWbH41F6",
    title: "Region V",
    caption: "Oplan Kontra Baha video from Region V.",
    date: "2026-10-12",
  },
  {
    id: "1zUE6hrDeAWgBbWKJ5IeZYspidxvnYE7j",
    title: "Region III",
    caption: "Oplan Kontra Baha video from Region III.",
    date: "2026-08-24",
  },
  {
    id: "1B4joqDemmKH7Un3B7kvf_e9YHKWDj91L",
    title: "Region I",
    caption: "Oplan Kontra Baha video from Region I.",
    date: "2026-08-02",
  },
  {
    id: "16JbK9IBguwLcwBFnhl9SXRQ0onWs5jd9",
    title: "Bacolod City",
    caption: "Oplan Kontra Baha video from Bacolod City.",
    date: "2026-07-20",
  },
  {
    id: "1cNBdff59Fzdy8ohyQDnBKuja-o9QxJAk",
    title: "Region VII",
    caption: "Oplan Kontra Baha video from Region VII.",
    date: "2026-07-20",
  },
  {
    id: "15U7McfeMw072sL7hqw3jHK8XmF-cXOl6",
    title: "Iligan",
    caption: "Oplan Kontra Baha video from Iligan.",
    date: "2026-07-15",
  },
  {
    id: "1vtCWwKfz3DScKs0SA6wtYKV0hEwfPn6e",
    title: "OKB Maguindanao",
    caption: "Oplan Kontra Baha video from Maguindanao.",
    date: "2026-07-15",
  },
  {
    id: "1dqQGaCHP8yklElpxcvERjN5vbceOhb_4",
    title: "Maam Rox video",
    caption: "Oplan Kontra Baha video shared by Maam Rox.",
    date: "2026-07-15",
  },
];
