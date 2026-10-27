/** Arrival routes in configuration order; origin-only cities show their first departure. */
export function getCityVisits(routes: readonly { from: string; to: string }[], cityId: string): number[] {
  const arrivals = routes.flatMap((route, index) => (route.to === cityId ? [index] : []));
  if (arrivals.length) return arrivals;
  const departure = routes.findIndex((route) => route.from === cityId);
  return departure < 0 ? [] : [departure];
}
