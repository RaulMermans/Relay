export type IntakeSource = "meta_ads" | "google_ads" | "shopify" | "unknown";
export type SourceConfidence = "high" | "medium" | "low";

export type SourceDetection = {
  source: IntakeSource;
  confidence: SourceConfidence;
  matchedSignals: string[];
  conflictingSignals: string[];
};

type HeaderSignal = {
  aliases: string[];
  weight: number;
};

type ProviderSignature = {
  source: Exclude<IntakeSource, "unknown">;
  signals: HeaderSignal[];
};

const META_ADS_SIGNALS: HeaderSignal[] = [
  { aliases: ["campaign", "campaign name"], weight: 2 },
  { aliases: ["ad set", "ad set name"], weight: 3 },
  { aliases: ["amount spent", "spend"], weight: 3 },
  { aliases: ["impressions"], weight: 1 },
  { aliases: ["link clicks", "clicks", "outbound clicks"], weight: 1 },
  { aliases: ["purchases", "website purchases"], weight: 1 },
  {
    aliases: ["purchase conversion value", "website purchase conversion value"],
    weight: 2,
  },
];

const GOOGLE_ADS_SIGNALS: HeaderSignal[] = [
  { aliases: ["campaign", "campaign name"], weight: 2 },
  { aliases: ["ad group", "ad group name"], weight: 3 },
  { aliases: ["cost", "cost (micros)"], weight: 3 },
  { aliases: ["impressions", "impr."], weight: 1 },
  { aliases: ["clicks", "interactions"], weight: 1 },
  { aliases: ["conversions", "all conv."], weight: 1 },
  { aliases: ["conv. value", "conversion value", "all conv. value"], weight: 2 },
];

const SHOPIFY_SIGNALS: HeaderSignal[] = [
  { aliases: ["name", "order", "order name"], weight: 2 },
  { aliases: ["created at", "paid at", "processed at"], weight: 3 },
  { aliases: ["total", "total sales"], weight: 2 },
  { aliases: ["subtotal"], weight: 2 },
  { aliases: ["financial status", "payment status"], weight: 3 },
  { aliases: ["email", "customer email"], weight: 1 },
];

const PROVIDER_SIGNATURES: ProviderSignature[] = [
  { source: "meta_ads", signals: META_ADS_SIGNALS },
  { source: "google_ads", signals: GOOGLE_ADS_SIGNALS },
  { source: "shopify", signals: SHOPIFY_SIGNALS },
];

function normalizeHeader(header: string): string {
  return header.replace(/^\uFEFF/, "").trim().replace(/\s+/g, " ").toLowerCase();
}

function findMatchedSignals(headers: string[], signals: HeaderSignal[]): {
  score: number;
  matchedSignals: string[];
} {
  const normalizedHeaders = new Map(headers.map((header) => [normalizeHeader(header), header]));
  let score = 0;
  const matchedSignals: string[] = [];

  for (const signal of signals) {
    const matchedAlias = signal.aliases.find((alias) => normalizedHeaders.has(alias));

    if (matchedAlias) {
      score += signal.weight;
      matchedSignals.push(normalizedHeaders.get(matchedAlias) ?? matchedAlias);
    }
  }

  return { score, matchedSignals };
}

export function detectSource(headers: string[]): SourceDetection {
  const candidates = PROVIDER_SIGNATURES.map((signature) => ({
    source: signature.source,
    ...findMatchedSignals(headers, signature.signals),
  }))
    .filter((candidate) => candidate.score >= 6)
    .sort((left, right) => right.score - left.score);
  const candidate = candidates[0];

  if (!candidate) {
    return {
      source: "unknown",
      confidence: "low",
      matchedSignals: [],
      conflictingSignals: [],
    };
  }

  const conflicts = candidates.filter(
    (contender) => contender !== candidate && candidate.score - contender.score < 2,
  );

  if (conflicts.length > 0) {
    return {
      source: "unknown",
      confidence: "low",
      matchedSignals: candidate.matchedSignals,
      conflictingSignals: [candidate, ...conflicts].map(
        (contender) => `${contender.source}: ${contender.matchedSignals.join(", ")}`,
      ),
    };
  }

  if (candidate.score >= 7) {
    return {
      source: candidate.source,
      confidence: "high",
      matchedSignals: candidate.matchedSignals,
      conflictingSignals: [],
    };
  }

  if (candidate.score === 6) {
    return {
      source: candidate.source,
      confidence: "medium",
      matchedSignals: candidate.matchedSignals,
      conflictingSignals: [],
    };
  }

  throw new Error("Unreachable source detection outcome");
}
