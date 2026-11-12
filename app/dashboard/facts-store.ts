// The latest PayPal data the dashboard was rendered with, readable outside React: by the agent's
// tools, which must validate against current invoices even after a refresh, and by the briefing
// widget. The dashboard publishes here whenever its data changes.

import type { DashboardData } from '@/lib/dashboard-data';

let data: DashboardData | undefined;
const listeners = new Set<() => void>();

export function publishFacts(next: DashboardData) {
  if (next === data) return;
  data = next;
  listeners.forEach((listener) => listener());
}

export const subscribeFacts = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const getFacts = () => data;
export const getServerFacts = () => undefined;
