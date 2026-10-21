import { describe, expect, it } from 'vitest';
import { googleMapsUrl, whatsappUrl } from './external-links';

describe('enlaces externos', () => {
  it('crea WhatsApp solo desde un teléfono E.164 y no agrega mensajes', () => {
    expect(whatsappUrl('+526691234567')).toBe('https://wa.me/526691234567');
    expect(whatsappUrl('+351211234567')).toBe('https://wa.me/351211234567');
    expect(whatsappUrl('6691234567')).toBeNull();
    expect(whatsappUrl('+52 669 123 4567')).toBeNull();
    expect(whatsappUrl('javascript:alert(1)')).toBeNull();
  });

  it('prefiere coordenadas válidas, incluidas negativas', () => {
    expect(
      googleMapsUrl({
        direccion: 'Esta dirección no debe usarse',
        latitud: '23.248610',
        longitud: '-106.455310',
      }),
    ).toBe('https://www.google.com/maps/search/?api=1&query=23.248610%2C-106.455310');
  });

  it('codifica direcciones con acentos y caracteres especiales', () => {
    const address = 'Av. Ejército Mexicano #123, Centro & Malecón, Mazatlán';
    expect(googleMapsUrl({ direccion: address })).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    );
  });

  it('usa la dirección si las coordenadas no son válidas y se oculta sin ubicación', () => {
    expect(googleMapsUrl({ direccion: 'Centro, Mazatlán', latitud: 91, longitud: -106 })).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Centro, Mazatlán')}`,
    );
    expect(googleMapsUrl({ direccion: '  ', latitud: null, longitud: null })).toBeNull();
  });
});
