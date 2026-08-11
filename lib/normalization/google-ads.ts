import { normalizeAdvertising } from "./advertising";
import type { AdvertisingObservation, NormalizerInput } from "./types";

export function normalizeGoogleAds(input: NormalizerInput): AdvertisingObservation[] {
  return normalizeAdvertising("google_ads", input);
}
