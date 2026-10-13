import type { PaymentRecord } from "./payment.types";

// Timestamps are stored at millisecond precision. A retry can share its
// timestamp with the failed link, so use the numbered payment reference as
// the tie-breaker before falling back to the record ID.
export function isNewerPaymentAttempt(candidate: PaymentRecord, previous: PaymentRecord): boolean {
  const timeDifference = Date.parse(candidate.createdAt) - Date.parse(previous.createdAt);
  if (Number.isFinite(timeDifference) && timeDifference !== 0) return timeDifference > 0;
  const candidateNumber = paymentAttemptNumber(candidate.referenceId);
  const previousNumber = paymentAttemptNumber(previous.referenceId);
  return candidateNumber > previousNumber;
}

function paymentAttemptNumber(referenceId: string): number {
  const number = Number(referenceId.match(/-PAY-(\d+)$/)?.[1] ?? 0);
  return Number.isSafeInteger(number) ? number : 0;
}

/**
 * An order can have several iPaymu references after an expired or failed link.
 * The most recent balance attempt takes precedence over a paid deposit. Within
 * one payment purpose, a settled or disputed attempt must take precedence over
 * an outstanding newer link so the customer cannot be prompted to pay twice.
 */
export function selectPaymentForOrder(
  payments: PaymentRecord[],
): PaymentRecord | null {
  const sorted = [...payments].sort((a, b) => {
    if (isNewerPaymentAttempt(a, b)) return -1;
    if (isNewerPaymentAttempt(b, a)) return 1;
    return b.id.localeCompare(a.id);
  });
  const newest = sorted[0];
  if (!newest) return null;

  const purpose = sorted.some((payment) => payment.paymentPurpose === "balance")
    ? "balance"
    : newest.paymentPurpose ?? "full";
  const attempts = sorted.filter(
    (payment) => (payment.paymentPurpose ?? "full") === purpose,
  );
  return (
    attempts.find((payment) => payment.status === "manual_review") ??
    attempts.find((payment) => payment.status === "paid") ??
    attempts[0] ?? null
  );
}
