export function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

export function buildDeadline(secondsFromNow: number): number {
  return nowUnix() + secondsFromNow;
}
