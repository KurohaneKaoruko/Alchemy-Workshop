"use client";

import { usePathname } from "next/navigation";

export function RouteTransitionOverlay() {
  const pathname = usePathname();

  return (
    <div key={pathname} className="route-transition-overlay route-transition-overlay--active">
      <div className="route-transition-overlay__sigil" />
    </div>
  );
}
