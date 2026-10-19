import Link from "next/link";
import { cn } from "@/lib/utils";

/** Switches between the share picker and the crypto picker. */
export default function MarketSwitch({ active }: { active: "shares" | "crypto" }) {
  const item = (href: string, key: "shares" | "crypto", label: string) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={cn(
        "focus-visible:ring-ring/50 rounded-md px-3 py-1 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px]",
        active === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Market" className="bg-muted inline-flex rounded-lg p-1">
      {item("/picks", "shares", "JSE shares")}
      {item("/crypto", "crypto", "Crypto")}
    </nav>
  );
}
