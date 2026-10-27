import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse } from 'yaml';

const { getCityRegionStyles } = await import('../../src/components/footprints/city-regions.ts');
const data = JSON.parse(fs.readFileSync('public/data/footprint-cities.geojson', 'utf8'));
for (const name of ['苏州市', '南京市', '合肥市', '洛阳市', '西安市', '武汉市'])
  assert(
    data.features.some((f) => f.properties.name === name),
    name,
  );
const styles = getCityRegionStyles(['苏州', '上海']);
assert(styles.some((r) => r.name === '苏州市' && r.itemStyle.areaColor !== 'transparent'));
assert(styles.some((r) => r.name === '上海市' && r.itemStyle.opacity === 1));
assert(!styles.some((r) => r.name === '南京市'));
console.log('市界数据及到访区域高亮校验通过');

const provinces = JSON.parse(fs.readFileSync('public/data/china.geojson', 'utf8'));
const config = parse(fs.readFileSync('config/footprints.yaml', 'utf8'));
const names = new Set([...provinces.features, ...data.features].map((feature) => feature.properties.name));
for (const city of config.locations) assert(names.has(`${city.name}市`), `缺少${city.name}的边界数据`);
