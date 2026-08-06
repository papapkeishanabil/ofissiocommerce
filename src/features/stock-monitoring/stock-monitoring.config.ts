import "server-only";

export function getStockMonitoringConfig() {
  const requestedSource = process.env.STOCK_SOURCE?.trim().toLowerCase() || "woocommerce";
  return {
    enabled: process.env.STOCK_MONITORING_ENABLED?.trim().toLowerCase() !== "false",
    source: "woocommerce" as const,
    requestedSource,
    defaultMinimumQty: nonNegativeInteger(
      process.env.STOCK_DEFAULT_MINIMUM_QTY,
      10,
    ),
    // This is a business invariant, not a presentation preference. Even if an
    // unsafe env value is supplied, customer payloads remain stock-free.
    customerVisibility: false as const,
  };
}

function nonNegativeInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}
