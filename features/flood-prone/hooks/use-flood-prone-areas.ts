"use client";

import { useMemo, useState } from "react";
import { floodProneService } from "@/features/flood-prone/services/flood-prone.service";

export function useFloodProneAreas() {
  const areas = useMemo(() => floodProneService.getAreas(), []);
  const deoGroups = useMemo(() => floodProneService.getDeoGroups(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deoFilter, setDeoFilter] = useState<string>("all");

  const filteredAreas = useMemo(() => {
    const query = search.trim().toLowerCase();
    return areas.filter((area) => {
      if (deoFilter !== "all" && area.deo !== deoFilter) return false;
      if (!query) return true;
      return (
        area.description.toLowerCase().includes(query) ||
        area.deo.toLowerCase().includes(query)
      );
    });
  }, [areas, deoFilter, search]);

  return {
    areas,
    deoGroups,
    filteredAreas,
    selectedId,
    setSelectedId,
    search,
    setSearch,
    deoFilter,
    setDeoFilter,
  };
}
