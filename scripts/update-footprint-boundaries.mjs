import fs from 'node:fs/promises';

// DataV.GeoAtlas city boundaries for provinces covered by the current footprints.
const provinceCodes = [130000, 320000, 330000, 340000, 410000, 420000, 430000, 610000];
const results = await Promise.all(
  provinceCodes.map(async (code) => {
    const url = `https://geo.datav.aliyun.com/areas_v3/bound/${code}_full.json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    const data = await response.json();
    return data.features.map(({ geometry, properties }) => ({
      type: 'Feature',
      properties: { name: properties.name, adcode: properties.adcode, parent: properties.parent },
      geometry,
    }));
  }),
);
await fs.writeFile(
  'public/data/footprint-cities.geojson',
  JSON.stringify({ type: 'FeatureCollection', features: results.flat() }),
);
console.log(`Saved ${results.flat().length} city boundaries.`);
