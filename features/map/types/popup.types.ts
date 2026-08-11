import type { ReactNode } from "react";
import type { LngLat } from "@/types/geo";
import type { Feature } from "geojson";

export interface PopupAction {
  id: string;
  label: string;
  variant?: "primary" | "ghost" | "danger";
  onClick?: () => void;
}

export interface PopupContent {
  title: string;
  description?: string;
  imageUrl?: string;
  status?: string;
  statusTone?: "default" | "success" | "warning" | "danger" | "info";
  coordinates?: LngLat;
  metadata?: Record<string, string>;
  actions?: readonly PopupAction[];
  footer?: ReactNode;
}

export interface PopupState {
  open: boolean;
  lngLat: LngLat | null;
  screenPoint: { x: number; y: number } | null;
  feature: Feature | null;
  content: PopupContent | null;
}

export const INITIAL_POPUP_STATE: PopupState = {
  open: false,
  lngLat: null,
  screenPoint: null,
  feature: null,
  content: null,
};
