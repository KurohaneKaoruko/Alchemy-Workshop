import { RESOURCE_KEYS, type ResourcePool } from "@/features/game/types";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createEmptyResources(): ResourcePool {
  return RESOURCE_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as ResourcePool);
}

export function mergeResourceDelta(
  resources: ResourcePool,
  delta: Partial<ResourcePool>,
): ResourcePool {
  const next = { ...resources };

  for (const key of RESOURCE_KEYS) {
    if (delta[key] === undefined) {
      continue;
    }
    next[key] = Math.max(0, resources[key] + (delta[key] ?? 0));
  }

  return next;
}

export function hasEnoughResources(
  resources: ResourcePool,
  cost: Partial<ResourcePool>,
): boolean {
  return RESOURCE_KEYS.every((key) => resources[key] >= (cost[key] ?? 0));
}

export function consumeResources(
  resources: ResourcePool,
  cost: Partial<ResourcePool>,
): ResourcePool {
  const delta: Partial<ResourcePool> = {};
  for (const key of RESOURCE_KEYS) {
    if ((cost[key] ?? 0) > 0) {
      delta[key] = -(cost[key] ?? 0);
    }
  }
  return mergeResourceDelta(resources, delta);
}

export function pickOne<T>(items: readonly T[], rng = Math.random): T {
  return items[Math.floor(rng() * items.length)]!;
}

export function chance(rng: () => number, rate: number): boolean {
  return rng() < clamp(rate, 0, 1);
}

export function createEntryId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}
