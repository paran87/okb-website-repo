"use client";

import { useMemo, useState } from "react";
import { floodProneService } from "@/features/flood-prone/services/flood-prone.service";

const unique = (values: string[]) =>
  [...new Set(values)].sort((a, b) => a.localeCompare(b));

/** Records plus search / region / province / municipality filter state. */
export function useFloodProneAreas() {
  const records = useMemo(() => floodProneService.getRecords(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [province, setProvince] = useState("all");
  const [municipality, setMunicipality] = useState("all");

  const regions = useMemo(() => unique(records.map((r) => r.region)), [records]);
  const provinces = useMemo(
    () =>
      unique(
        records
          .filter((r) => region === "all" || r.region === region)
          .map((r) => r.province),
      ),
    [records, region],
  );
  const municipalities = useMemo(
    () =>
      unique(
        records
          .filter(
            (r) =>
              (region === "all" || r.region === region) &&
              (province === "all" || r.province === province),
          )
          .map((r) => r.municipality),
      ),
    [records, region, province],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((r) => {
      if (region !== "all" && r.region !== region) return false;
      if (province !== "all" && r.province !== province) return false;
      if (municipality !== "all" && r.municipality !== municipality) return false;
      if (!query) return true;
      return [r.road, r.location, r.municipality, r.deo, r.description].some(
        (field) => field.toLowerCase().includes(query),
      );
    });
  }, [records, region, province, municipality, search]);

  return {
    records,
    filtered,
    regions,
    provinces,
    municipalities,
    selectedId,
    setSelectedId,
    search,
    setSearch,
    region,
    setRegion: (v: string) => {
      setRegion(v);
      setProvince("all");
      setMunicipality("all");
    },
    province,
    setProvince: (v: string) => {
      setProvince(v);
      setMunicipality("all");
    },
    municipality,
    setMunicipality,
  };
}
