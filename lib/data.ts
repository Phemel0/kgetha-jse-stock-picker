import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { PicksLog, Snapshot } from "./types";

function load<T>(file: string): T | null {
  const p = path.join(process.cwd(), "data", file);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T) : null;
}

/** The agent writes snapshot.json; until it has run, the clearly labelled demo set is used. */
export function loadSnapshot(): Snapshot | null {
  return load<Snapshot>("snapshot.json") ?? load<Snapshot>("demo-snapshot.json");
}

export function loadPicksLog(snapshot: Snapshot): PicksLog {
  return snapshot.source === "demo" ? [] : (load<PicksLog>("picks-log.json") ?? []);
}

/** Most recent closing-price date across the snapshot. */
export function latestPriceDate(snapshot: Snapshot): string | null {
  return (
    snapshot.stocks
      .map((s) => s.priceDate)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null
  );
}
