export function stableHash(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function stableId(parts: string[], length = 12): string {
  return stableHash(parts.join(":")).toString(36).padStart(length, "0").slice(0, length);
}

export function stablePick<T>(items: T[], key: string): T {
  if (items.length === 0) {
    throw new Error("stablePick requires at least one item.");
  }
  return items[stableHash(key) % items.length];
}
