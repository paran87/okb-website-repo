import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getPhilippineCitiesWeatherGeoJson } from "@/features/weather/services/city-weather.service";

export const dynamic = "force-dynamic";

/** GeoJSON of all 149 Philippine cities with regional PAGASA weather conditions. */
export const GET = withApiHandler(async () => {
  const geojson = await getPhilippineCitiesWeatherGeoJson();
  return ok(geojson, {
    meta: {
      cityCount: geojson.features.length,
    },
  });
});
