/**
 * YouTube videos embedded in the public Gallery → Videos tab (shown before the uploaded videos).
 * Add an entry here to embed another one: `id` is the part after `v=` (or after `/live/`) in the link.
 */
export interface GalleryYoutubeVideo {
  id: string;
  title: string;
  caption: string;
  /** Channel that published it. */
  source: string;
  /** ISO date of the event, when known. */
  date?: string;
}

export const GALLERY_YOUTUBE_VIDEOS: readonly GalleryYoutubeVideo[] = [
  {
    id: "KripK7GKxGA",
    title: "Launching of Oplan Kontra Baha: Greater Metro Manila Waterways Clearing and Cleaning Operations",
    caption:
      "The launch of Oplan Kontra Baha in Greater Metro Manila: the national drive to clear and clean creeks, rivers and drainage channels of the garbage, silt and obstructions that cause flooding.",
    source: "RTVMalacañang",
  },
  {
    id: "91_Eu0aeTxc",
    title: "Launching of Oplan Kontra Baha: Metro Cebu Waterways Clearing and Cleaning Operations",
    caption:
      "Oplan Kontra Baha comes to Metro Cebu: the November 21, 2025 launch of waterways clearing and cleaning operations to keep the city's waterways flowing and reduce flooding.",
    source: "RTVMalacañang",
    date: "2025-11-21T00:00:00+08:00",
  },
  {
    id: "lB5IjTKX270",
    title: "Oplan Kontra Baha: Inspection of Bacolod City Waterways Clearing and Cleaning Operations",
    caption:
      "An inspection of the waterways clearing and cleaning operations in Bacolod City under Oplan Kontra Baha, checking the progress of work on the city's waterways.",
    source: "RTVMalacañang",
  },
];
