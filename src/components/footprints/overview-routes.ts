export function mergeOverviewRoutes<T extends { from: string; to: string }>(routes: readonly T[]): T[] {
  const seen = new Set<string>();
  return routes.filter((route) => {
    const key = JSON.stringify([route.from, route.to].sort());
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getOverviewLineStyle(route: { from: string; to: string; overviewCurveness?: number }, hoveredCityId?: string) {
  const connected = route.from === hoveredCityId || route.to === hoveredCityId;
  return {
    color: '#e85b8c',
    width: hoveredCityId && connected ? 3 : 1.8,
    opacity: hoveredCityId ? (connected ? 0.95 : 0.08) : 0.62,
    curveness: route.overviewCurveness ?? 0.12,
  };
}

type Point = { lng: number; lat: number };
type LayoutRoute = { from: string; to: string; fromLocation: Point; toLocation: Point };
type XY = [number, number];

// Match ECharts' geo aspect and quadratic control point in screen coordinates.
function sampleCurve(route: LayoutRoute, curveness: number): XY[] {
  const start: XY = [route.fromLocation.lng * 0.86, -route.fromLocation.lat];
  const end: XY = [route.toLocation.lng * 0.86, -route.toLocation.lat];
  const control: XY = [
    (start[0] + end[0]) / 2 + (end[1] - start[1]) * curveness,
    (start[1] + end[1]) / 2 - (end[0] - start[0]) * curveness,
  ];
  return Array.from({ length: 25 }, (_, index) => {
    const t = index / 24;
    return [0, 1].map((axis) => (1 - t) ** 2 * start[axis] + 2 * t * (1 - t) * control[axis] + t ** 2 * end[axis]) as XY;
  });
}

export function layoutOverviewRoutes<T extends LayoutRoute>(routes: readonly T[]): (T & { overviewCurveness: number })[] {
  const merged = mergeOverviewRoutes(routes);
  const cities = new Map(
    merged.flatMap(
      (route) =>
        [
          [route.from, route.fromLocation],
          [route.to, route.toLocation],
        ] as const,
    ),
  );
  const length = (route: T) =>
    Math.hypot((route.toLocation.lng - route.fromLocation.lng) * 0.86, route.toLocation.lat - route.fromLocation.lat);
  const key = (route: T) => JSON.stringify([route.from, route.to].sort());
  const sorted = [...merged].sort((a, b) => length(a) - length(b) || key(a).localeCompare(key(b)));
  const placed: { route: T; samples: XY[] }[] = [];
  const curves = new Map<string, number>();
  for (const route of sorted) {
    let best = 0;
    let bestScore = Infinity;
    for (const bend of [0, 0.08, -0.08, 0.16, -0.16, 0.24, -0.24, 0.32, -0.32]) {
      const samples = sampleCurve(route, bend);
      let score = Math.abs(bend) * 0.8;
      for (const [id, city] of cities) {
        if (id === route.from || id === route.to) continue;
        const distance = Math.min(...samples.map(([x, y]) => Math.hypot(x - city.lng * 0.86, y + city.lat)));
        score += Math.max(0, 0.45 - distance) ** 2 * 30;
      }
      // Penalize running alongside earlier short routes. Endpoints may still meet naturally.
      for (const previous of placed) {
        for (const point of samples.slice(3, -3)) {
          const distance = Math.min(
            ...previous.samples.slice(3, -3).map((other) => Math.hypot(point[0] - other[0], point[1] - other[1])),
          );
          score += Math.max(0, 0.32 - distance) ** 2 * 3;
        }
      }
      if (score < bestScore) {
        bestScore = score;
        best = bend;
      }
    }
    curves.set(key(route), best);
    placed.push({ route, samples: sampleCurve(route, best) });
  }
  return merged.map((route) => ({ ...route, overviewCurveness: curves.get(key(route)) || 0 }));
}
