import { ProviderRegistry } from "./provider.interface";
import { MockProvider } from "./mock/mock-provider";

/** Create and return the default provider registry with mock provider */
export function createDefaultRegistry(): ProviderRegistry {
  const registry = new ProviderRegistry();
  registry.register(new MockProvider());
  return registry;
}

export { ProviderRegistry } from "./provider.interface";
export { MockProvider } from "./mock/mock-provider";
export type { FareProvider, FareSearchParams } from "./provider.interface";
