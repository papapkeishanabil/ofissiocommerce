import "server-only";
import { getProductImportStagingConfig } from "../product-import.config";
import { localProductImportStagingProvider } from "./local-product-import-staging.provider";
export function getProductImportStagingProvider(){getProductImportStagingConfig();return localProductImportStagingProvider;}
