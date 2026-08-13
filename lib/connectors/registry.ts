import type { Connector, Provider } from "./types";

export type ConnectorRegistryEntry = {
  provider: Provider;
  displayName: string;
  frameworkStatus: "ready";
  implementationStatus: "implemented" | "not_built";
  configured: false;
  connector: Connector | null;
};

export const CONNECTOR_REGISTRY: readonly ConnectorRegistryEntry[] = [
  {
    provider: "shopify",
    displayName: "Shopify",
    frameworkStatus: "ready",
    implementationStatus: "implemented",
    configured: false,
    connector: null,
  },
  {
    provider: "meta_ads",
    displayName: "Meta Ads",
    frameworkStatus: "ready",
    implementationStatus: "implemented",
    configured: false,
    connector: null,
  },
  {
    provider: "google_ads",
    displayName: "Google Ads",
    frameworkStatus: "ready",
    implementationStatus: "not_built",
    configured: false,
    connector: null,
  },
];
