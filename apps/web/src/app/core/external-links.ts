export interface ManualLocation {
  direccion?: string | null;
  latitud?: string | number | null;
  longitud?: string | number | null;
}

const E164_PHONE = /^\+[1-9]\d{7,14}$/;

export function whatsappUrl(phone: string | null | undefined): string | null {
  if (!phone || !E164_PHONE.test(phone)) return null;
  return `https://wa.me/${phone.slice(1)}`;
}

export function googleMapsUrl(location: ManualLocation): string | null {
  const latitude = coordinate(location.latitud, -90, 90);
  const longitude = coordinate(location.longitud, -180, 180);
  const address = location.direccion?.trim();
  const query =
    latitude !== null && longitude !== null
      ? `${location.latitud},${location.longitud}`
      : address || null;
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
}

function coordinate(
  value: string | number | null | undefined,
  minimum: number,
  maximum: number,
): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) && numeric >= minimum && numeric <= maximum ? numeric : null;
}
