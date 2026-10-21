const TIME_ZONE = 'America/Mazatlan';

function partsInZone(date: Date): Record<string, number> {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]),
  );
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function calendarToday(now = new Date()): string {
  const parts = partsInZone(now);
  return `${parts['year']}-${pad(parts['month'])}-${pad(parts['day'])}`;
}

export function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function addCalendarMonth(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const targetMonthStart = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(
    Date.UTC(targetMonthStart.getUTCFullYear(), targetMonthStart.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(
      targetMonthStart.getUTCFullYear(),
      targetMonthStart.getUTCMonth(),
      Math.min(day, lastDay),
    ),
  )
    .toISOString()
    .slice(0, 10);
}

export function dateTimeNow(now = new Date()): string {
  const parts = partsInZone(now);
  return `${parts['year']}-${pad(parts['month'])}-${pad(parts['day'])}T${pad(parts['hour'])}:${pad(parts['minute'])}`;
}

export function mazatlanDateTimeToIso(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error('Fecha y hora inválidas.');
  const [, year, month, day, hour, minute] = match.map(Number);
  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute);
  let instant = desiredUtc;
  for (let iteration = 0; iteration < 2; iteration += 1) {
    const zoned = partsInZone(new Date(instant));
    const representedUtc = Date.UTC(
      zoned['year'],
      zoned['month'] - 1,
      zoned['day'],
      zoned['hour'],
      zoned['minute'],
      zoned['second'],
    );
    instant += desiredUtc - representedUtc;
  }
  return new Date(instant).toISOString();
}
