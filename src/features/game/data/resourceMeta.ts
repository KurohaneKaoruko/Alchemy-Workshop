import type { ResourceKey } from "@/features/game/types";

export const RESOURCE_LABELS: Record<ResourceKey, string> = {
  salt: "盐",
  sulfur: "硫",
  mercury: "汞",
  ash: "草木灰",
  ironSand: "赤铁砂",
  moonDew: "月露",
  sunShard: "日辉碎片",
  aetherDust: "灵尘",
  philosopherSeed: "贤者种",
  philosopherStone: "贤者之石",
};

export const RESOURCE_VALUES: Record<ResourceKey, number> = {
  ash: 1,
  ironSand: 1,
  salt: 2,
  sulfur: 3,
  mercury: 4,
  moonDew: 5,
  sunShard: 7,
  aetherDust: 8,
  philosopherSeed: 13,
  philosopherStone: 34,
};

export const CIRCLE_INPUT_ORDER: ResourceKey[] = [
  "ash",
  "ironSand",
  "salt",
  "sulfur",
  "mercury",
  "moonDew",
  "sunShard",
  "aetherDust",
  "philosopherSeed",
];

export const EQUIVALENT_OUTPUT_OPTIONS: ResourceKey[] = [
  "ash",
  "ironSand",
  "salt",
  "sulfur",
  "mercury",
  "moonDew",
  "sunShard",
  "aetherDust",
];
