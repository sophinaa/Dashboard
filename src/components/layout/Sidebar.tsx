"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useStudy } from "@/components/providers/StudyProvider";

export const NAV = [
  { href: "/", label: "Overview", icon: "overview", page: "overview" },
  { href: "/products", label: "Products", icon: "products", page: "products" },
  { href: "/journey", label: "Customer journey", icon: "journey", page: "journey" },
  { href: "/marketing", label: "Marketing", icon: "marketing", page: "marketing" },
  { href: "/experiments", label: "Experiments", icon: "experiments", page: "experiments" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const study = useStudy();
  return (
    <nav aria-label="Dashboard sections" className="flex h-full flex-col">
      <div className="px-4 pb-4 pt-5">
        <p className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink">
          <span aria-hidden className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-forest text-sm font-bold text-white">
            S
          </span>
          StoreScope
        </p>
        <p className="mt-1 pl-9 text-xs text-ink-muted">Shop performance, explained</p>
      </div>
      <ul className="flex flex-col gap-1 px-3">
        {NAV.map((n) => {
          const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-forest text-white" : "text-ink-2 hover:bg-sunken hover:text-ink"}`}
              >
                <Icon name={n.icon} />
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto space-y-3 px-5 pb-6 pt-6 text-xs text-ink-muted">
        {!study.participantMode && (
          <Link href="/researcher" className="flex items-center gap-2 rounded-md px-1 py-1 font-medium text-ink-2 hover:text-forest">
            <Icon name="settings" className="h-4 w-4" />
            Researcher setup
          </Link>
        )}
        <p className="leading-relaxed">Research prototype. All shop figures are synthetic.</p>
      </div>
    </nav>
  );
}
