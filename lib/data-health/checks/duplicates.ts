import { isCanonicalDate } from "../reporting-period";
import type { AdvertisingObservation } from "../../normalization/types";
import { createFinding, type CanonicalObservation, type DataHealthFinding } from "../types";

function advertisingCandidateKey(observation: AdvertisingObservation): string | null {
  if (!isCanonicalDate(observation.date) || !observation.sourceAccountId) return null;
  const entityIds = [observation.campaignId, observation.groupId, observation.adId];
  if (!entityIds.some(Boolean)) return null;
  return [observation.source, observation.date, observation.sourceAccountId, ...entityIds.map((value) => value ?? "")].join("|");
}

export function checkDuplicates(observations: CanonicalObservation[]): DataHealthFinding[] {
  const findings: DataHealthFinding[] = [];
  const shopifyOrders = new Map<string, number>();
  const advertisingCandidates = new Map<string, { source: "meta_ads" | "google_ads"; date: string; count: number }>();

  for (const observation of observations) {
    if (observation.domain === "commerce") {
      if (!observation.orderId) {
        findings.push(
          createFinding({
            code: "COMMERCE_ORDER_ID_MISSING",
            category: "duplicates",
            severity: "error",
            source: "shopify",
            field: "orderId",
            message: "A commerce observation is missing the order identity required for duplicate safety.",
            evidence: { observationCount: 1 },
          }),
        );
      } else {
        shopifyOrders.set(observation.orderId, (shopifyOrders.get(observation.orderId) ?? 0) + 1);
      }
      continue;
    }
    const key = advertisingCandidateKey(observation);
    if (!key) continue;
    const existing = advertisingCandidates.get(key);
    advertisingCandidates.set(key, {
      source: observation.source,
      date: observation.date,
      count: (existing?.count ?? 0) + 1,
    });
  }

  const duplicateOrderCount = [...shopifyOrders.values()].filter((count) => count > 1).length;
  if (duplicateOrderCount > 0) {
    findings.push(
      createFinding({
        code: "SHOPIFY_DUPLICATE_ORDER",
        category: "duplicates",
        severity: "error",
        source: "shopify",
        field: "orderId",
        message: "Repeated Shopify order identities are confirmed duplicate observations.",
        evidence: { duplicateKeyCount: duplicateOrderCount },
      }),
    );
  }
  for (const candidate of advertisingCandidates.values()) {
    if (candidate.count < 2) continue;
    findings.push(
      createFinding({
        code: "ADVERTISING_DUPLICATE_CANDIDATE",
        category: "duplicates",
        severity: "warning",
        source: candidate.source,
        period: { start: candidate.date, end: candidate.date },
        message: "Advertising observations share a provider/date/entity key and require review before aggregation.",
        evidence: { observationCount: candidate.count },
      }),
    );
  }
  return findings;
}
