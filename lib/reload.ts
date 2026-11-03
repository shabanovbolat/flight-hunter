"use client";

/**
 * Next 15.5.x drops/aborts soft router refreshes that follow a server action
 * (reproducible in production builds, not in dev; 15.4 is fine but has
 * security advisories). Admin mutations therefore reload the page, which is
 * always consistent. Participant/host screens don't depend on the router.
 */
export function reloadPage() {
  window.location.reload();
}
