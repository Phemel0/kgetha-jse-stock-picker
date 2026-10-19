import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CoinPicksLog, CoinSnapshotFile } from "./types";

function load<T>(file: string): T | null {
  const p = path.join(process.cwd(), "data", file);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T) : null;
}

/** The crypto agent writes crypto-snapshot.json; until it has run, the clearly labelled demo set is used. */
export function loadCoinSnapshot(): CoinSnapshotFile | null {
  return load<CoinSnapshotFile>("crypto-snapshot.json") ?? load<CoinSnapshotFile>("crypto-demo-snapshot.json");
}

export function loadCoinPicksLog(snapshot: CoinSnapshotFile): CoinPicksLog {
  return snapshot.source === "demo" ? [] : (load<CoinPicksLog>("crypto-picks-log.json") ?? []);
}
