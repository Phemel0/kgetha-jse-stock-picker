/** R1 234.56 — thin-space grouping, as on most SA price boards. */
export function rand(n: number | null): string {
  if (n === null) return "—";
  const [whole, frac] = n.toFixed(2).split(".");
  return `R${whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}.${frac}`;
}

export function signed(n: number | null, unit = "%"): string {
  if (n === null) return "—";
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}${unit}`;
}

export function num(n: number | null, unit = "", dp = 1): string {
  if (n === null) return "—";
  return `${n < 0 ? "−" : ""}${Math.abs(n).toFixed(dp)}${unit}`;
}

export function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

/** Rand price for any size of coin: R1 234 567.89, R12.34, R0.004521. */
export function zar(n: number | null): string {
  if (n === null) return "—";
  if (Math.abs(n) >= 1) return rand(n);
  if (n === 0) return "R0.00";
  // Four significant figures for sub-rand prices.
  const dp = Math.min(10, Math.max(2, 3 - Math.floor(Math.log10(Math.abs(n)))));
  return `R${n.toFixed(dp)}`;
}
