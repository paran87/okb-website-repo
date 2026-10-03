import type { LayerConfig } from "@/features/map/types";

/** Layer registry focused on DEOS 2026 flood-prone road sections. */
export function createFloodProneLayerRegistry(): LayerConfig[] {
  return [
    {
      id: "deos-flood-prone-areas",
      sourceId: "source-deos-flood-prone-areas",
      label: "DEOS Flood-Prone Areas (2026)",
      kind: "point",
      category: "flood-prone",
      visible: true,
      opacity: 1,
      order: 10,
      dataKey: "deos-flood-prone-areas",
      layerIds: [
        "deos-flood-prone-areas-circle",
        "deos-flood-prone-areas-selected",
        "deos-flood-prone-areas-labels",
      ],
      interactive: true,
      cluster: false,
      legend: [
        { id: "fpa-located", label: "Located", color: "#2563eb", shape: "circle" },
        { id: "fpa-review", label: "Needs review", color: "#f97316", shape: "circle" },
        { id: "fpa-selected", label: "Selected", color: "#0f172a", shape: "circle" },
      ],
      metadata: {
        description: "DPWH DEOS Updated Flood Prone Areas 2026 — NCR road sections",
        source: "DEOS Updated Flood Prone Areas 2026",
        featureCount: 123,
        tags: ["deos", "ncr", "2026"],
      },
    },
  ];
}
