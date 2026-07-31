// Helpers for displaying price range unit labels.
// Presets are localized; anything else is shown as-is (custom unit set by the provider).
const PRESET: Record<string, string> = {
  service: 'serviço',
  hour: 'hora',
  visit: 'visita',
  day: 'dia',
};

export function formatPriceUnit(unit: string | undefined | null): string {
  if (!unit) return 'serviço';
  const key = unit.trim().toLowerCase();
  return PRESET[key] ?? unit.trim();
}

// Short suffix like "/h", "/visita", "/m²" for compact card labels.
export function formatPriceSuffix(unit: string | undefined | null): string {
  if (!unit) return '';
  const key = unit.trim().toLowerCase();
  if (key === 'service') return '';
  if (key === 'hour') return '/h';
  return `/${PRESET[key] ?? unit.trim()}`;
}
