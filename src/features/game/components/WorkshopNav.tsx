"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
}

interface WorkshopNavProps {
  items: NavItem[];
}

function isItemActive(pathname: string, href: string): boolean {
  if (href === "/workshop") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function WorkshopNav({ items }: WorkshopNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMobileOpen((value) => !value)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#b78f4f]/45 bg-[#2b2115]/85 text-[#f4e2bd] md:hidden"
        aria-expanded={mobileOpen}
        aria-label={mobileOpen ? "收起导航" : "展开导航"}
      >
        <span
          className={`absolute h-[2px] w-4 bg-current transition ${
            mobileOpen ? "rotate-45" : "-translate-y-[5px]"
          }`}
        />
        <span
          className={`absolute h-[2px] w-4 bg-current transition ${
            mobileOpen ? "opacity-0" : "opacity-100"
          }`}
        />
        <span
          className={`absolute h-[2px] w-4 bg-current transition ${
            mobileOpen ? "-rotate-45" : "translate-y-[5px]"
          }`}
        />
      </button>

      <nav className="hidden items-center gap-2 md:flex">
        {items.map((item) => {
          const active = isItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`game-nav-chip rounded-md border px-3 py-1.5 text-sm ${
                active
                  ? "game-nav-chip--active border-[#e3bf78]"
                  : "border-[#b79358]/45"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {mobileOpen ? (
        <nav className="workshop-mobile-panel absolute right-0 top-11 z-30 grid min-w-[11rem] gap-1 rounded-lg border border-[#ad8749]/55 p-2 md:hidden">
          {items.map((item) => {
            const active = isItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`game-nav-chip rounded-md border px-3 py-2 text-sm ${
                  active
                    ? "game-nav-chip--active border-[#e3bf78]"
                    : "border-[#b79358]/45"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
