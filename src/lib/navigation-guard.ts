// Module-level navigation guard — set by CreatePage, read by sidebar.
// Avoids adding hook calls mid-component which can cause ordering issues.

let guard: ((to: string) => void) | null = null;

export function setNavigationGuard(fn: ((to: string) => void) | null) {
  guard = fn;
}

export function interceptNavigate(to: string, navigate: (to: string) => void) {
  if (guard) {
    guard(to);
  } else {
    navigate(to);
  }
}
