import "server-only";

/**
 * GPS position from a JPEG's EXIF block (the first bytes of the file), or null when the photo has none. Only what
 * the gallery needs: latitude/longitude from the GPS IFD (tags 1–4).
 */
export function exifGps(bytes: Uint8Array): { lat: number; lng: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    const size = view.getUint16(offset + 2);
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return null; // start of scan: no EXIF before the image
    if (marker === 0xffe1 && offset + 10 <= view.byteLength && view.getUint32(offset + 4) === 0x45786966) {
      return tiffGps(view, offset + 10, Math.min(view.byteLength, offset + 2 + size));
    }
    offset += 2 + size;
  }
  return null;
}

function tiffGps(view: DataView, tiff: number, end: number): { lat: number; lng: number } | null {
  if (tiff + 8 > end) return null;
  const order = view.getUint16(tiff);
  if (order !== 0x4949 && order !== 0x4d4d) return null;
  const le = order === 0x4949;
  const u16 = (o: number) => view.getUint16(o, le);
  const u32 = (o: number) => view.getUint32(o, le);
  const inRange = (o: number, n: number) => o >= tiff && o + n <= end;

  /** Entries of the IFD at [ifd] (relative to the TIFF header) as tag → entry offset. */
  const entries = (ifd: number) => {
    const map = new Map<number, number>();
    const at = tiff + ifd;
    if (!inRange(at, 2)) return map;
    const count = u16(at);
    for (let i = 0; i < count; i++) {
      const e = at + 2 + i * 12;
      if (!inRange(e, 12)) break;
      map.set(u16(e), e);
    }
    return map;
  };

  const gpsPointer = entries(u32(tiff + 4)).get(0x8825);
  if (gpsPointer === undefined) return null;
  const gps = entries(u32(gpsPointer + 8));
  const ref = (tag: number) => {
    const e = gps.get(tag);
    return e === undefined ? "" : String.fromCharCode(view.getUint8(e + 8));
  };
  /** Degrees, minutes, seconds (three RATIONALs) → decimal degrees. */
  const dms = (tag: number) => {
    const e = gps.get(tag);
    if (e === undefined || u16(e + 2) !== 5 || u32(e + 4) < 3) return null;
    const at = tiff + u32(e + 8);
    if (!inRange(at, 24)) return null;
    const part = (i: number) => {
      const den = u32(at + i * 8 + 4);
      return den ? u32(at + i * 8) / den : 0;
    };
    return part(0) + part(1) / 60 + part(2) / 3600;
  };

  const lat = dms(2);
  const lng = dms(4);
  if (lat === null || lng === null || (lat === 0 && lng === 0)) return null;
  const signedLat = ref(1) === "S" ? -lat : lat;
  const signedLng = ref(3) === "W" ? -lng : lng;
  if (Math.abs(signedLat) > 90 || Math.abs(signedLng) > 180) return null;
  return { lat: signedLat, lng: signedLng };
}
