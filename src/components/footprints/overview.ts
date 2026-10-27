/** Fit visited cities, with room for city labels around the outermost points. */
export function getOverviewBounds(locations: readonly { lng: number; lat: number }[]): number[][] | undefined {
  if (!locations.length) return undefined;
  const longitudes = locations.map((location) => location.lng);
  const latitudes = locations.map((location) => location.lat);
  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  const horizontalPadding = Math.max(1.2, (east - west) * 0.12);
  const verticalPadding = Math.max(1, (north - south) * 0.12);
  return [
    [west - horizontalPadding, north + verticalPadding],
    [east + horizontalPadding, south - verticalPadding],
  ];
}
