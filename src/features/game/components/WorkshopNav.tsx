"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setDrawerOpen((value) => !value)}
        className="workshop-nav-toggle"
        aria-expanded={drawerOpen}
        aria-label={drawerOpen ? "收起导航" : "展开导航"}
      >
        <span className="workshop-nav-toggle__icon" aria-hidden>
          <span
            className={`workshop-nav-toggle__line ${
              drawerOpen ? "workshop-nav-toggle__line--top-open" : "workshop-nav-toggle__line--top"
            }`}
          />
          <span
            className={`workshop-nav-toggle__line ${
              drawerOpen ? "workshop-nav-toggle__line--middle-open" : "workshop-nav-toggle__line--middle"
            }`}
          />
          <span
            className={`workshop-nav-toggle__line ${
              drawerOpen ? "workshop-nav-toggle__line--bottom-open" : "workshop-nav-toggle__line--bottom"
            }`}
          />
        </span>
        <span className="workshop-nav-toggle__copy">
          <span className="workshop-nav-toggle__label">工坊导航</span>
          <span className="workshop-nav-toggle__hint">{drawerOpen ? "收起分区" : `${items.length} 个分区`}</span>
        </span>
      </button>

      {drawerOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                className="workshop-nav-drawer__scrim"
                aria-label="关闭导航抽屉"
                onClick={() => setDrawerOpen(false)}
              />
              <aside className="workshop-nav-drawer workshop-mobile-panel">
                <div className="workshop-nav-drawer__header">
                  <div className="workshop-nav-drawer__title-group">
                    <p className="workshop-nav-drawer__eyebrow">Workshop Routes</p>
                    <h2 className="workshop-nav-drawer__title">工坊分区</h2>
                  </div>
                  <button
                    type="button"
                    className="workshop-nav-drawer__close"
                    onClick={() => setDrawerOpen(false)}
                  >
                    收起
                  </button>
                </div>
                <nav className="workshop-nav-drawer__list">
                  {items.map((item) => {
                    const active = isItemActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setDrawerOpen(false)}
                        className={`game-nav-chip workshop-nav-drawer__item flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                          active ? "game-nav-chip--active border-[#e3bf78]" : "border-[#b79358]/45"
                        }`}
                      >
                        {item.label}
                        <span aria-hidden>{active ? "•" : "→"}</span>
                      </Link>
                    );
                  })}
                </nav>
              </aside>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
