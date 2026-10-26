import { parsePhoneNumberFromString } from 'libphonenumber-js/min';

export const DEFAULT_COUNTRY_CODE = '+52';

const COUNTRY_CODE = /^\+[1-9]\d{0,2}$/;
const NATIONAL_NUMBER = /^[\d\s().-]*$/;
const E164_PHONE = /^\+[1-9]\d{7,14}$/;
const COORDINATES = /^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*$/;

export interface PhoneParts {
  countryCode: string;
  nationalNumber: string;
}

export interface CoordinatePair {
  latitude: number;
  longitude: number;
}

export function splitInternationalPhone(phone: string | null | undefined): PhoneParts {
  if (!phone) return { countryCode: DEFAULT_COUNTRY_CODE, nationalNumber: '' };

  const parsed = parsePhoneNumberFromString(phone);
  if (parsed) {
    return {
      countryCode: `+${parsed.countryCallingCode}`,
      nationalNumber: parsed.nationalNumber,
    };
  }

  const digits = phone.replace(/\D/gu, '');
  return digits.length > 1
    ? { countryCode: `+${digits[0]}`, nationalNumber: digits.slice(1) }
    : { countryCode: DEFAULT_COUNTRY_CODE, nationalNumber: digits };
}

export function buildInternationalPhone(
  countryCode: string,
  nationalNumber: string,
): string | null {
  const local = nationalNumber.trim();
  if (!local) return null;
  if (!NATIONAL_NUMBER.test(local)) return null;

  const code = countryCode.replace(/\s/gu, '');
  const phone = `${code}${local.replace(/\D/gu, '')}`;
  return COUNTRY_CODE.test(code) && E164_PHONE.test(phone) ? phone : null;
}

export function isInternationalPhoneInputValid(
  countryCode: string,
  nationalNumber: string,
): boolean {
  return !nationalNumber.trim() || buildInternationalPhone(countryCode, nationalNumber) !== null;
}

export function parseCoordinatesInput(value: string): CoordinatePair | null {
  const match = COORDINATES.exec(value);
  if (!match) return null;

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    latitude: roundCoordinate(latitude),
    longitude: roundCoordinate(longitude),
  };
}

export function isCoordinatesInputValid(value: string): boolean {
  return !value.trim() || parseCoordinatesInput(value) !== null;
}

export function formatCoordinates(
  latitude: string | number | null | undefined,
  longitude: string | number | null | undefined,
): string {
  return latitude === null ||
    latitude === undefined ||
    latitude === '' ||
    longitude === null ||
    longitude === undefined ||
    longitude === ''
    ? ''
    : `${latitude}, ${longitude}`;
}

function roundCoordinate(value: number): number {
  return Number(value.toFixed(6));
}
