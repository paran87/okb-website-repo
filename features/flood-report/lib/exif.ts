/**
 * Writes a minimal EXIF block (date taken + GPS position) into a JPEG made by a canvas, so a photo sent
 * from the mobile page is a real geotagged file: Google Photos, Windows, phones and the Command Center's
 * Operations map all read its location.
 *
 * Layout (big-endian TIFF): IFD0 { DateTime, ExifIFD →, GPS IFD → } · ExifIFD { DateTimeOriginal } ·
 * GPS IFD { version, lat ref, lat, lng ref, lng, UTC time, UTC date, horizontal error }.
 */

const BYTE = 1;
const ASCII = 2;
const LONG = 4;
const RATIONAL = 5;

interface Entry {
  tag: number;
  type: number;
  count: number;
  /** Big-endian value bytes. */
  data: Uint8Array;
}

function ascii(text: string): Uint8Array {
  const out = new Uint8Array(text.length + 1);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0x7f;
  return out;
}

function rationals(values: [number, number][]): Uint8Array {
  const out = new Uint8Array(values.length * 8);
  const view = new DataView(out.buffer);
  values.forEach(([num, den], i) => {
    view.setUint32(i * 8, Math.max(0, Math.round(num)));
    view.setUint32(i * 8 + 4, Math.max(1, Math.round(den)));
  });
  return out;
}

function long(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value);
  return out;
}

/** Degrees → [deg, min, sec] rationals (seconds to 1/10000). */
function dms(value: number): [number, number][] {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = (minFloat - min) * 60;
  return [
    [deg, 1],
    [min, 1],
    [Math.round(sec * 10000), 10000],
  ];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Size of an IFD including its out-of-line values (each padded to an even length). */
function ifdSize(entries: Entry[]): number {
  return 2 + entries.length * 12 + 4 + entries.reduce((n, e) => n + (e.data.length > 4 ? e.data.length + (e.data.length % 2) : 0), 0);
}

/** Writes one IFD at `offset` (TIFF-relative); returns the offset after it. */
function writeIfd(view: DataView, bytes: Uint8Array, offset: number, entries: Entry[]): number {
  let data = offset + 2 + entries.length * 12 + 4;
  view.setUint16(offset, entries.length);
  entries.forEach((e, i) => {
    const at = offset + 2 + i * 12;
    view.setUint16(at, e.tag);
    view.setUint16(at + 2, e.type);
    view.setUint32(at + 4, e.count);
    if (e.data.length <= 4) {
      bytes.set(e.data, at + 8);
    } else {
      view.setUint32(at + 8, data);
      bytes.set(e.data, data);
      data += e.data.length + (e.data.length % 2);
    }
  });
  view.setUint32(offset + 2 + entries.length * 12, 0);
  return data;
}

export interface ExifGps {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  takenAt: Date;
}

/** The APP1 (Exif) segment bytes, marker included. */
export function buildExif({ latitude, longitude, accuracyM, takenAt }: ExifGps): Uint8Array<ArrayBuffer> {
  const local = `${takenAt.getFullYear()}:${pad(takenAt.getMonth() + 1)}:${pad(takenAt.getDate())} ${pad(takenAt.getHours())}:${pad(takenAt.getMinutes())}:${pad(takenAt.getSeconds())}`;
  const gps: Entry[] = [
    { tag: 0x0000, type: BYTE, count: 4, data: new Uint8Array([2, 3, 0, 0]) },
    { tag: 0x0001, type: ASCII, count: 2, data: ascii(latitude >= 0 ? "N" : "S") },
    { tag: 0x0002, type: RATIONAL, count: 3, data: rationals(dms(latitude)) },
    { tag: 0x0003, type: ASCII, count: 2, data: ascii(longitude >= 0 ? "E" : "W") },
    { tag: 0x0004, type: RATIONAL, count: 3, data: rationals(dms(longitude)) },
    {
      tag: 0x0007,
      type: RATIONAL,
      count: 3,
      data: rationals([
        [takenAt.getUTCHours(), 1],
        [takenAt.getUTCMinutes(), 1],
        [takenAt.getUTCSeconds(), 1],
      ]),
    },
    {
      tag: 0x001d,
      type: ASCII,
      count: 11,
      data: ascii(`${takenAt.getUTCFullYear()}:${pad(takenAt.getUTCMonth() + 1)}:${pad(takenAt.getUTCDate())}`),
    },
  ];
  if (accuracyM !== null && Number.isFinite(accuracyM)) {
    gps.push({ tag: 0x001f, type: RATIONAL, count: 1, data: rationals([[accuracyM * 100, 100]]) });
  }
  const exif: Entry[] = [{ tag: 0x9003, type: ASCII, count: 20, data: ascii(local) }];
  // Pointer values are filled in once the sizes are known.
  const ifd0: Entry[] = [
    { tag: 0x0132, type: ASCII, count: 20, data: ascii(local) },
    { tag: 0x8769, type: LONG, count: 1, data: long(0) },
    { tag: 0x8825, type: LONG, count: 1, data: long(0) },
  ];
  const ifd0At = 8;
  const exifAt = ifd0At + ifdSize(ifd0);
  const gpsAt = exifAt + ifdSize(exif);
  ifd0[1] = { ...ifd0[1]!, data: long(exifAt) };
  ifd0[2] = { ...ifd0[2]!, data: long(gpsAt) };
  const tiffLength = gpsAt + ifdSize(gps);

  const header = 2 + 2 + 6; // marker, length, "Exif\0\0"
  const out = new Uint8Array(header + tiffLength);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0xffe1);
  view.setUint16(2, out.length - 2);
  out.set([0x45, 0x78, 0x69, 0x66, 0, 0], 4);
  const tiff = new Uint8Array(out.buffer, header);
  const tv = new DataView(out.buffer, header);
  tiff.set([0x4d, 0x4d, 0x00, 0x2a]);
  tv.setUint32(4, ifd0At);
  writeIfd(tv, tiff, ifd0At, ifd0);
  writeIfd(tv, tiff, exifAt, exif);
  writeIfd(tv, tiff, gpsAt, gps);
  return out;
}

/** The JPEG with the EXIF segment inserted right after its SOI marker. */
export async function withExif(jpeg: Blob, gps: ExifGps): Promise<Blob> {
  const bytes = new Uint8Array(await jpeg.arrayBuffer());
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return jpeg;
  return new Blob([bytes.subarray(0, 2), buildExif(gps), bytes.subarray(2)], { type: "image/jpeg" });
}
