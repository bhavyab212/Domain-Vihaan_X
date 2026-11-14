/** Opt in to React Router v7 behaviour now so the v6 -> v7 upgrade is a no-op and console warnings stay clean. */
export const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;
