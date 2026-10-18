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
