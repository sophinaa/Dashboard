"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useStudy } from "@/components/providers/StudyProvider";

export const NAV = [
  { href: "/", label: "Overview", icon: "overview", page: "overview", heading: "How Willow & Co is doing" },
  { href: "/products", label: "Products", icon: "products", page: "products", heading: "Your products" },
  { href: "/journey", label: "Customer journey", icon: "journey", page: "journey", heading: "How shoppers move through the shop" },
  { href: "/marketing", label: "Marketing", icon: "marketing", page: "marketing", heading: "Where your orders come from" },
  { href: "/experiments", label: "Experiments", icon: "experiments", page: "experiments", heading: "Homepage banner test" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const study = useStudy();
  return (
    <nav aria-label="Dashboard sections" className="flex h-full flex-col">
      <div className="px-6 pb-8 pt-7">
        <p className="text-2xl font-semibold tracking-tight text-white">
          storescope<span aria-hidden className="text-tile-sage">.</span>
        </p>
      </div>
      <p className="px-6 pb-2 text-xs font-medium text-night-muted">Dashboard</p>
      <ul className="flex flex-col gap-1 px-3">
        {NAV.map((n) => {
          const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium ${
                  active ? "bg-tile-sage text-ink" : "text-night-text hover:bg-night-2 hover:text-white"
                }`}
              >
                <Icon name={n.icon} className="h-[18px] w-[18px]" />
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
      {!study.participantMode && (
        <>
          <p className="px-6 pb-2 pt-6 text-xs font-medium text-night-muted">Study</p>
          <ul className="px-3">
            <li>
              <Link href="/researcher" className="flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium text-night-text hover:bg-night-2 hover:text-white">
                <Icon name="settings" className="h-[18px] w-[18px]" />
                Researcher setup
              </Link>
            </li>
          </ul>
        </>
      )}
      <div className="mt-auto p-3">
        <div className="rounded-2xl bg-night-2 p-4">
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full bg-tile-butter text-ink">
              <Icon name="store" className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Willow &amp; Co</p>
              <p className="text-xs text-night-muted">Skincare shop</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-night-text">A fictional shop. Every figure here is synthetic research data.</p>
        </div>
      </div>
    </nav>
  );
}
