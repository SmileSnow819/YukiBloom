import type { PublicFootprints, PublicTimeline } from '../public-api/types';

export function getTimelineValidationError(timeline: PublicTimeline): string | null {
  return timeline.items.some((item) => !item.company.trim() || !item.startDate.trim())
    ? '请为每条经历填写公司和开始日期。'
    : null;
}

export function getFootprintsValidationError(footprints: PublicFootprints): string | null {
  if (
    footprints.locations.some(
      (location) => !location.name.trim() || !Number.isFinite(location.lat) || !Number.isFinite(location.lng),
    )
  ) {
    return '请为每个地点填写名称、有效纬度和经度。';
  }
  if (
    footprints.stays.some(
      (stay) =>
        !stay.title.trim() ||
        !stay.startDate.trim() ||
        !footprints.locations.some((location) => location.id === stay.locationId),
    )
  ) {
    return '每条停留记录都需要标题、开始日期和有效的所属地点。';
  }
  if (footprints.routes.some((route) => !route.from.trim() || !route.to.trim())) {
    return '每条路线都需要填写出发地和目的地。';
  }
  return null;
}
