import type { KYCProvider } from "./provider.interface";
import { DevelopmentKYCProvider } from "./development.provider";
import { ProductionKYCProvider } from "./production.provider";

export function getKycProvider(): KYCProvider {
  const configuredProvider = process.env.KYC_PROVIDER?.trim();
  if (!configuredProvider) {
    throw new Error("KYC_PROVIDER must be explicitly configured; refusing to use a development provider by default.");
  }
  const providerType = configuredProvider.toUpperCase();

  switch (providerType) {
    case "DEVELOPMENT":
      return new DevelopmentKYCProvider();
    case "ONFIDO":
    case "PERSONA":
      return new ProductionKYCProvider(providerType);
    default:
      throw new Error(`Unsupported KYC_PROVIDER '${configuredProvider}'.`);
  }
}
