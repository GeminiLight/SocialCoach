/** Art direction follows the authored scene clock, rather than the device clock. */
export function roomLightPeriod(time: string): 'day' | 'dusk' | 'evening' {
  const hour = Number(time.split(':')[0]);
  if (hour >= 19 || hour < 7) return 'evening';
  return hour >= 18 ? 'dusk' : 'day';
}
