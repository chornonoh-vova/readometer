export function getBucket(value: number, max: number, count = 5) {
  if (value <= 0 || max <= 0) return 0;

  const scaled = (value / max) * (count - 1);
  const level = Math.floor(scaled);

  return Math.min(count - 1, level + 1);
}
