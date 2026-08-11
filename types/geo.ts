import type {
  Feature,
  FeatureCollection,
  Geometry,
  Point,
  Polygon,
  MultiPolygon,
} from "geojson";

/** A [longitude, latitude] tuple following the GeoJSON axis order. */
export type LngLat = [longitude: number, latitude: number];

export interface MapViewport {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
}

export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/**
 * Strongly-typed GeoJSON aliases so feature layers declare exactly which
 * geometry and property shape they carry.
 */
export type PointFeature<P> = Feature<Point, P>;
export type PolygonFeature<P> = Feature<Polygon | MultiPolygon, P>;
export type TypedFeatureCollection<G extends Geometry, P> = FeatureCollection<
  G,
  P
>;

export type {
  Feature,
  FeatureCollection,
  Geometry,
  Point,
  Polygon,
  MultiPolygon,
};
