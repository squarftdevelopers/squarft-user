// Officer rejection currently persists as cancelled with one of these reason labels.
const officerRejectionReason = /^(Customer did not answer the call|Customer requested cancellation|Sales officer is unavailable|Customer requirement does not match this property)(:|$)/;
const terminalStatuses = new Set(['REJECTED', 'CANCELLED', 'COMPLETED', 'RESCHEDULED']);

export function visitDisplayStatus(visit) {
  if (visit.status === 'cancelled' && officerRejectionReason.test(visit.cancellation_reason || '')) return 'REJECTED';
  if (visit.status === 'pending_confirmation') return 'PENDING';
  return String(visit.status || '').toUpperCase();
}

export function isVisitInHistory(status, timestamp, now) {
  return terminalStatuses.has(status) || timestamp < now;
}
