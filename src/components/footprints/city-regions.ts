export function getCityRegionStyles(cityNames: readonly string[]) {
  return cityNames.map((name) => ({
    name: `${name}市`,
    itemStyle: { areaColor: 'rgba(233, 87, 140, 0.4)', opacity: 1 },
    emphasis: { itemStyle: { areaColor: 'rgba(233, 87, 140, 0.56)', opacity: 1 } },
  }));
}
