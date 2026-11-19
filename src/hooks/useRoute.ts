import { useSyncExternalStore } from 'react';

export type Route = 'overview' | 'signals' | 'monitoring' | 'lab' | 'tests' | 'barrier' | 'pytorch' | 'ideas';

// Hash-based routing: works on any static hosting (Render static site) without server rewrites.
function read(): Route {
  if (window.location.hash.startsWith('#/signals')) return 'signals';
  if (window.location.hash.startsWith('#/monitoring')) return 'monitoring';
  if (window.location.hash.startsWith('#/lab')) return 'lab';
  if (window.location.hash.startsWith('#/tests')) return 'tests';
  if (window.location.hash.startsWith('#/barrier')) return 'barrier';
  if (window.location.hash.startsWith('#/pytorch')) return 'pytorch';
  if (window.location.hash.startsWith('#/ideas')) return 'ideas';
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
  lab: '#/lab',
  tests: '#/tests',
  barrier: '#/barrier',
  pytorch: '#/pytorch',
  ideas: '#/ideas',
};
