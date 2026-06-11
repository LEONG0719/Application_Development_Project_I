export function createOrderedTimestamps(count: number) {
  const lastTimestamp = Date.now();
  const firstTimestamp = lastTimestamp - Math.max(count - 1, 0);

  return Array.from(
    { length: count },
    (_, index) => new Date(firstTimestamp + index),
  );
}
