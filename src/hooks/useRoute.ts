import { useSyncExternalStore } from 'react';

export type Route = 'overview' | 'signals' | 'monitoring' | 'tests' | 'barrier';

// Hash-based routing: works on any static hosting (Render static site) without server rewrites.
function read(): Route {
  if (window.location.hash.startsWith('#/signals')) return 'signals';
  if (window.location.hash.startsWith('#/monitoring')) return 'monitoring';
  if (window.location.hash.startsWith('#/tests')) return 'tests';
  if (window.location.hash.startsWith('#/barrier')) return 'barrier';
  return 'overview';
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, read, () => 'overview');
}

export const routeHref: Record<Route, string> = {
  overview: '#/',
  signals: '#/signals',
  monitoring: '#/monitoring',
  tests: '#/tests',
  barrier: '#/barrier',
};
