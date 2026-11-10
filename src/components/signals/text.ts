import type { HorizonSignal } from '../../api/types';

const HORIZON_LABELS: Record<string, string> = {
  '1h': '1 час',
  '2h': '2 часа',
  '4h': '4 часа',
};

export const horizonLabel = (horizon: string) => HORIZON_LABELS[horizon] ?? horizon;

export const directionLabel = (direction: 'up' | 'down') => (direction === 'up' ? 'Вверх' : 'Вниз');

/** Backend gate reasons are in English; translate the known ones. */
export function reasonText(reason: string): string {
  let m = reason.match(/^only (\d+) independent signals >= (\d+)% \(need (\d+)\)/);
  if (m) return `на проверке было ${m[1]} независимых сигналов ≥ ${m[2]}% (нужно минимум ${m[3]})`;
  m = reason.match(/^hit rate ([\d.]+)% below (\d+)%/);
  if (m) return `сигналы сбывались в ${m[1]}% случаев (нужно ≥ ${m[2]}%)`;
  m = reason.match(/^95% lower bound ([\d.]+)% below (\d+)%/);
  if (m) return `статистически подтверждено только ${m[1]}% (нужно ≥ ${m[2]}%)`;
  return reason;
}

export function statusText(signal: HorizonSignal): string {
  return signal.status === 'approved'
    ? 'Проверенная модель'
    : 'Теневой режим — модель не прошла проверку, только для наблюдения';
}
