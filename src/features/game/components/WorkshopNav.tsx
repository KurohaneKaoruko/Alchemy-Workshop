"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <nav className="mt-4 flex flex-wrap gap-2">
      {items.map((item) => {
        const active = isItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`game-nav-chip rounded-lg border px-3 py-1.5 text-sm hover:bg-[#f2e4c4] ${
              active
                ? "game-nav-chip--active border-[#7c663c] bg-[#f2e4c4]"
                : "border-[#7a6640]/60 bg-[#fff8e7]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
