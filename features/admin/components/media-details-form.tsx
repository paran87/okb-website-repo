"use client";

import { useState } from "react";
import { Crosshair, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { fromManilaInput, toManilaInput } from "@/features/admin/format";
import type { MediaDetails } from "@/features/admin/types";

/** The form's text values; converted to [MediaDetails] on save. */
export interface DetailsForm {
  title: string;
  caption: string;
  takenAt: string;
  place: string;
  latitude: string;
  longitude: string;
}

export const EMPTY_DETAILS: DetailsForm = { title: "", caption: "", takenAt: "", place: "", latitude: "", longitude: "" };

export function detailsToForm(d: MediaDetails): DetailsForm {
  return {
    title: d.title ?? "",
    caption: d.caption ?? "",
    takenAt: toManilaInput(d.takenAt),
    place: d.place ?? "",
    latitude: d.latitude != null ? String(d.latitude) : "",
    longitude: d.longitude != null ? String(d.longitude) : "",
  };
}

function parseCoord(value: string, limit: number): number | null | "invalid" {
  const v = value.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : "invalid";
}

/** Validates the form; returns the details to save, or an error message. */
export function formToDetails(f: DetailsForm, withCoordinates: boolean): { details: MediaDetails } | { error: string } {
  const latitude = withCoordinates ? parseCoord(f.latitude, 90) : null;
  const longitude = withCoordinates ? parseCoord(f.longitude, 180) : null;
  if (latitude === "invalid") return { error: "Latitude must be a number between -90 and 90." };
  if (longitude === "invalid") return { error: "Longitude must be a number between -180 and 180." };
  if ((latitude === null) !== (longitude === null)) return { error: "Enter both latitude and longitude, or leave both empty." };
  if (f.takenAt && !fromManilaInput(f.takenAt)) return { error: "The date and time are not valid." };
  return {
    details: {
      title: f.title.trim() || null,
      caption: f.caption.trim() || null,
      takenAt: fromManilaInput(f.takenAt),
      place: f.place.trim() || null,
      ...(withCoordinates ? { latitude, longitude } : {}),
    },
  };
}

const TEXTAREA =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-body text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/40";

/**
 * Title, caption, date taken, place and (Command Center files) latitude and longitude.
 * Coordinates can be pasted from Google Maps ("14.5995, 120.9842") or taken from this device's location.
 */
export function MediaDetailsFields({
  value,
  onChange,
  withCoordinates,
  detailsAvailable,
}: {
  value: DetailsForm;
  onChange: (next: DetailsForm) => void;
  /** Command Center collections: the file can be placed on the Operations map. */
  withCoordinates: boolean;
  /** Date, place and coordinates can be saved (setup step done). */
  detailsAvailable: boolean;
}) {
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const set = (patch: Partial<DetailsForm>) => onChange({ ...value, ...patch });

  const useMyLocation = () => {
    setLocError(null);
    if (!("geolocation" in navigator)) {
      setLocError("This device cannot share its location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        set({ latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) });
      },
      () => {
        setLocating(false);
        setLocError("The location could not be read. Allow location access, or type the coordinates.");
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  // "14.5995, 120.9842" pasted into either box fills both.
  const pasteCoordinates = (text: string): boolean => {
    const m = /^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(text);
    if (!m) return false;
    set({ latitude: m[1] ?? "", longitude: m[2] ?? "" });
    return true;
  };

  return (
    <div className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-caption font-medium text-foreground">Title</span>
        <Input value={value.title} onChange={(e) => set({ title: e.target.value })} maxLength={200} placeholder="e.g. Declogging along España Blvd." />
      </label>
      <label className="block space-y-1.5">
        <span className="text-caption font-medium text-foreground">Caption</span>
        <textarea
          value={value.caption}
          onChange={(e) => set({ caption: e.target.value })}
          maxLength={2000}
          rows={3}
          placeholder="What was done, where and by whom"
          className={TEXTAREA}
        />
      </label>
      {detailsAvailable ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-caption font-medium text-foreground">Date and time taken</span>
              <Input type="datetime-local" value={value.takenAt} onChange={(e) => set({ takenAt: e.target.value })} />
              <span className="block text-[11px] leading-4 text-muted-foreground">Philippine time. Leave empty to use the upload time.</span>
            </label>
            <label className="block space-y-1.5">
              <span className="text-caption font-medium text-foreground">Place</span>
              <Input value={value.place} onChange={(e) => set({ place: e.target.value })} maxLength={200} placeholder="Barangay, city" />
            </label>
          </div>
          {withCoordinates ? (
            <fieldset className="space-y-2 rounded-xl border border-border p-3">
              <legend className="px-1 text-caption font-medium text-foreground">Location on the map</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-caption text-muted-foreground">Latitude</span>
                  <Input
                    inputMode="decimal"
                    value={value.latitude}
                    onChange={(e) => set({ latitude: e.target.value })}
                    onPaste={(e) => {
                      if (pasteCoordinates(e.clipboardData.getData("text"))) e.preventDefault();
                    }}
                    placeholder="14.599500"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-caption text-muted-foreground">Longitude</span>
                  <Input
                    inputMode="decimal"
                    value={value.longitude}
                    onChange={(e) => set({ longitude: e.target.value })}
                    onPaste={(e) => {
                      if (pasteCoordinates(e.clipboardData.getData("text"))) e.preventDefault();
                    }}
                    placeholder="120.984200"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-caption font-semibold text-foreground hover:bg-muted disabled:opacity-60"
              >
                {locating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Crosshair className="size-4" aria-hidden />}
                Use my current location
              </button>
              <p className="text-[11px] leading-4 text-muted-foreground">
                Tip: in Google Maps, press and hold a spot, tap the coordinates to copy them, then paste into either box. The photo or video
                then shows on the Operations map.
              </p>
              {locError ? <p className="text-[11px] leading-4 text-danger">{locError}</p> : null}
            </fieldset>
          ) : null}
        </>
      ) : (
        <p className="text-[11px] leading-4 text-muted-foreground">
          The date, place and coordinates become available after you run the Setup SQL again (Admin → Setup).
        </p>
      )}
    </div>
  );
}
