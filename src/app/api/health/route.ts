import { NextResponse } from "next/server";

import { getAuthRuntimeConfig } from "@/features/auth/auth.config";
import { getCarrierShippingConfig } from "@/features/carrier-shipping/carrier-shipping.config";
import { getCommerceRuntimeConfig } from "@/features/commerce/commerce.config";
import { getDatabaseHealth } from "@/features/database/database.health";
import { getEmailRuntimeConfig } from "@/features/email/email.config";
import { getPaymentRuntimeConfig } from "@/features/payment/payment.config";
import { getStockMonitoringConfig } from "@/features/stock-monitoring/stock-monitoring.config";
import { getStorageRuntimeConfig } from "@/features/storage/storage.config";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [database, auth, storage, email, payment, shipping, commerce, stock] = await Promise.all([
      getDatabaseHealth(),
      Promise.resolve(getAuthRuntimeConfig()),
      Promise.resolve(getStorageRuntimeConfig()),
      Promise.resolve(getEmailRuntimeConfig()),
      Promise.resolve(getPaymentRuntimeConfig()),
      Promise.resolve(getCarrierShippingConfig()),
      Promise.resolve(getCommerceRuntimeConfig()),
      Promise.resolve(getStockMonitoringConfig()),
    ]);

    const paymentConfigured =
      payment.provider === "mock" || payment.ipaymu.isComplete;
    const shippingConfigured =
      shipping.provider === "mock" || shipping.biteship.isConfigured;
    const operationalStatus =
      database.ok && database.schemaStatus !== "schema_missing"
        ? "ok"
        : "degraded";

    return NextResponse.json({
      status: operationalStatus,
      app: "ofissio",
      databaseProvider: database.provider,
      requestedDatabaseProvider: database.requestedProvider,
      databaseStatus: database.status,
      databaseConfigured: database.configured,
      schemaStatus: database.schemaStatus,
      missingTables: database.missingTables,
      authProvider: auth.provider,
      requestedAuthProvider: auth.requestedProvider,
      storageProvider: storage.provider,
      requestedStorageProvider: storage.requestedProvider,
      storageConfigured: storage.provider === "mock" || storage.supabaseConfigured,
      emailProvider: email.provider,
      requestedEmailProvider: email.requestedProvider,
      emailEnabled: email.enabled,
      resendConfigured: email.resendConfigured,
      smtpConfigured: email.smtp.configured,
      paymentProvider: payment.provider,
      paymentMode: payment.ipaymu.paymentMode,
      paymentConfigured,
      shippingProvider: shipping.provider,
      shippingMode: shipping.mode,
      shippingConfigured,
      productSource: commerce.productSource,
      woocommerceConfigured: commerce.woocommerce.isConfigured,
      stockCustomerVisible: stock.customerVisibility,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return safeErrorResponse(error, "Health check belum tersedia.", 503);
  }
}
