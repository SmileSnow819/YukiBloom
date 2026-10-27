function escapeText(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char,
  );
}

export function getCityTooltip(locations: readonly { name: string; impression?: string }[], regionName: string): string {
  const city = locations.find((location) => location.name === regionName || `${location.name}市` === regionName);
  if (!city) return '';
  const impression = city.impression?.trim();
  return `<div style="max-width:260px;white-space:normal;overflow-wrap:anywhere"><strong>${escapeText(city.name)}</strong>${impression ? `<div style="margin-top:6px;line-height:1.6">${escapeText(impression).replace(/\r?\n/g, '<br>')}</div>` : ''}</div>`;
}
