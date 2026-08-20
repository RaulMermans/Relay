import { normalizeAdvertising } from "./advertising";
import type { AdvertisingObservation, NormalizerInput } from "./types";

export function normalizeMetaAds(input: NormalizerInput): AdvertisingObservation[] {
  return normalizeAdvertising("meta_ads", input);
}
