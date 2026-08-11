import fs from "fs";
import path from "path";

const rawPath = path.resolve("features/flood-prone/data/deos-flood-prone-raw.json");
const outPath = path.resolve("features/flood-prone/data/deos-flood-prone.json");

/** [lng, lat] — approximate road/landmark coordinates in Metro Manila. */
const ROAD_COORDINATES = [
  [/españa|espana/i, [120.993, 14.608]],
  [/ramon magsaysay/i, [121.004, 14.596]],
  [/blumentritt/i, [120.982, 14.615]],
  [/jose abad santos/i, [120.978, 14.618]],
  [/mel lopez/i, [120.966, 14.628]],
  [/t\.m\. kalaw|tm kalaw/i, [120.987, 14.579]],
  [/buendia extension/i, [120.998, 14.554]],
  [/p\. ocampo|p ocampo/i, [120.995, 14.562]],
  [/roxas blvd/i, [120.979, 14.576]],
  [/taft avenue/i, [120.989, 14.558]],
  [/fairview avenue/i, [121.056, 14.698]],
  [/regalado avenue/i, [121.064, 14.734]],
  [/commonwealth avenue/i, [121.088, 14.676]],
  [/central avenue/i, [121.042, 14.653]],
  [/g\. araneta|g araneta/i, [121.009, 14.619]],
  [/maria clara street/i, [121.008, 14.622]],
  [/sto\. domingo|sto domingo/i, [121.007, 14.624]],
  [/general luis/i, [121.018, 14.732]],
  [/balintawak/i, [121.004, 14.658]],
  [/sm north|landers/i, [121.028, 14.657]],
  [/visayas avenue/i, [121.039, 14.651]],
  [/payatas/i, [121.103, 14.71]],
  [/batasan road/i, [121.095, 14.688]],
  [/quezon avenue/i, [121.034, 14.628]],
  [/a\. bonifacio|a bonifacio/i, [121.002, 14.641]],
  [/sgt\. rivera|sergeant rivera/i, [121.015, 14.648]],
  [/luzon avenue/i, [121.061, 14.668]],
  [/aurora blvd/i, [121.001, 14.595]],
  [/c-5|c5 road/i, [121.069, 14.586]],
  [/e\. rodriguez|e rodriguez/i, [121.018, 14.618]],
  [/east ave/i, [121.049, 14.635]],
  [/camp aguinaldo|centris/i, [121.043, 14.611]],
  [/elliptical/i, [121.05, 14.651]],
  [/kamias/i, [121.052, 14.628]],
  [/mo\. ignacia|mo ignacia/i, [121.045, 14.633]],
  [/timog|south ave/i, [121.036, 14.636]],
  [/tomas morato/i, [121.035, 14.635]],
  [/v\. luna|v luna/i, [121.047, 14.642]],
  [/p\. tuazon|p tuazon/i, [121.038, 14.62]],
  [/boni avenue/i, [121.031, 14.577]],
  [/shaw boulevard|shaw underpass/i, [121.054, 14.586]],
  [/psychopathic|wack wack/i, [121.038, 14.582]],
  [/imelda avenue/i, [121.098, 14.586]],
  [/amang rodriguez/i, [121.102, 14.597]],
  [/manila east road/i, [121.088, 14.592]],
  [/tiendesitas/i, [121.069, 14.586]],
  [/fort bonifacio|nichols field/i, [121.043, 14.528]],
  [/libingan ng mga bayani/i, [121.042, 14.542]],
  [/kalayaan service|c-5 kalayaan/i, [121.048, 14.558]],
  [/f\. manalo|f manalo/i, [121.035, 14.599]],
  [/sumulong/i, [121.115, 14.632]],
  [/parañaque-sucat|paranaque-sucat|sucat road/i, [121.018, 14.461]],
  [/pasong tamo/i, [121.014, 14.554]],
  [/ninoy aquino/i, [121.012, 14.508]],
  [/south super highway/i, [121.021, 14.553]],
  [/gil puyat/i, [121.018, 14.558]],
  [/vito cruz/i, [121.012, 14.562]],
  [/mac arthur highway/i, [120.98, 14.698]],
  [/g\. lazaro|g lazaro/i, [120.978, 14.702]],
  [/gov\. t\. santiago|gov t santiago/i, [120.982, 14.695]],
  [/c-3 road|nlex connector/i, [120.981, 14.652]],
  [/east service road/i, [120.985, 14.692]],
  [/polo-novaliches|novaliches road/i, [120.992, 14.708]],
  [/10th avenue/i, [120.995, 14.657]],
  [/deparo|bagumbong|camarin road/i, [121.003, 14.742]],
  [/congressional road/i, [121.012, 14.748]],
  [/quirino avenue|msr/i, [120.982, 14.467]],
  [/caa int/i, [120.988, 14.452]],
  [/marcos alvarez/i, [120.989, 14.445]],
  [/zapote-alabang|zapote alabang/i, [120.976, 14.442]],
  [/maharlika highway/i, [121.044, 14.408]],
  [/west service road/i, [121.035, 14.421]],
  [/ppta road/i, [121.038, 14.415]],
  [/gov\. w\. pascual|gov w pascual/i, [120.966, 14.662]],
  [/c\. arellano|c arellano/i, [120.962, 14.665]],
  [/m\.h\. del pilar|mh del pilar/i, [120.958, 14.658]],
  [/don basilio bautista|dampalit/i, [120.955, 14.672]],
  [/p\. aquino|p aquino/i, [120.953, 14.648]],
  [/sevilla blvd/i, [120.96, 14.655]],
  [/women's club|womens club/i, [120.957, 14.652]],
  [/edsa/i, [121.042, 14.635]],
];

const DEO_CENTROIDS = {
  "North Manila": [120.989, 14.61],
  "South Manila": [120.984, 14.552],
  "Quezon City 1st": [121.038, 14.676],
  "Quezon City 2nd": [121.05, 14.635],
  "Metro Manila 1st": [121.021, 14.659],
  "Metro Manila 2nd": [121.042, 14.618],
  "Metro Manila 3rd": [121.033, 14.579],
  "Las Piñas - Muntinlupa": [121.028, 14.423],
  "Malabon - Navotas": [120.957, 14.67],
};

function resolveCoordinates(description, deo, index) {
  for (const [pattern, coords] of ROAD_COORDINATES) {
    if (pattern.test(description)) {
      const jitter = ((index % 9) - 4) * 0.0012;
      return {
        coordinates: [coords[0] + jitter, coords[1] + jitter * 0.65],
        method: "road-lookup",
      };
    }
  }

  const [lng, lat] = DEO_CENTROIDS[deo] ?? [121.03, 14.6];
  const jitter = ((index % 11) - 5) * 0.0025;
  return {
    coordinates: [lng + jitter, lat + jitter * 0.6],
    method: "centroid",
  };
}

const entries = JSON.parse(fs.readFileSync(rawPath, "utf8"));
const stats = { "road-lookup": 0, centroid: 0 };

const features = entries.map((entry) => {
  const { coordinates, method } = resolveCoordinates(
    entry.description,
    entry.deo,
    entry.index,
  );
  stats[method]++;

  const shortTitle =
    entry.description.length > 72
      ? `${entry.description.slice(0, 69)}…`
      : entry.description;

  return {
    type: "Feature",
    properties: {
      id: entry.id,
      title: shortTitle,
      description: entry.description.replace(/&apos;/g, "'"),
      deo: entry.deo,
      index: entry.index,
      category: "flood-prone",
      geocodeMethod: method,
    },
    geometry: { type: "Point", coordinates },
  };
});

fs.writeFileSync(
  outPath,
  JSON.stringify({ type: "FeatureCollection", features }, null, 2),
  "utf8",
);

console.log(`Wrote ${features.length} features`);
console.log("Methods:", stats);
