import type { ChangeObservation } from "../change-intelligence/types";
import type { DataHealthFinding } from "../data-health/types";
import type { KpiMetricKey, KpiMetricResult } from "../kpi/types";

export type HumanizedFinding = {
  title: string;
  description: string;
  action: string | null;
  finding: DataHealthFinding;
};

export type PresentedObservation = {
  title: string;
  detail: string;
  tone: ChangeObservation["assessment"];
  observation: ChangeObservation;
};

const METRIC_LABELS: Record<KpiMetricKey, string> = {
  spend: "Spend",
  commerce_revenue: "Commerce revenue",
  orders: "Orders",
  impressions: "Impressions",
  clicks: "Clicks",
  conversions: "Conversions",
  attributed_revenue: "Attributed revenue",
  ctr: "CTR",
  cpc: "CPC",
  cpa: "CPA",
  roas: "ROAS",
  mer: "MER",
  aov: "AOV",
  conversion_rate: "Conversion rate",
};

const SOURCE_LABELS = { meta_ads: "Meta Ads", google_ads: "Google Ads", shopify: "Shopify" } as const;

function numeric(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function withUnicodeMinus(value: string): string {
  return value.replace("-", "−");
}

function currencyFor(metric: KpiMetricResult): string | null {
  return metric.inputs.find((input) => input.period === "current" && input.currencyCode)?.currencyCode
    ?? metric.inputs.find((input) => input.currencyCode)?.currencyCode
    ?? null;
}

export function formatMetricValue(metric: KpiMetricResult, value: string | null): string {
  if (value === null) return "—";
  const parsed = numeric(value);
  if (parsed === null) return "—";
  if (metric.unit === "currency") {
    const currency = currencyFor(metric);
    if (currency) {
      try {
        return withUnicodeMinus(new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
          currencyDisplay: "narrowSymbol",
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(parsed));
      } catch {
        return `${currency} ${withUnicodeMinus(new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(parsed))}`;
      }
    }
  }
  if (metric.unit === "count") {
    return withUnicodeMinus(new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(parsed));
  }
  if (metric.key === "ctr" || metric.key === "conversion_rate") {
    return withUnicodeMinus(new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(parsed));
  }
  return `${withUnicodeMinus(new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(parsed))}x`;
}

export function formatPercentageChange(value: string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const parsed = numeric(value);
  if (parsed === null) return "—";
  const formatted = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(Math.abs(parsed * 100));
  if (parsed > 0) return `+${formatted}%`;
  if (parsed < 0) return `−${formatted}%`;
  return `${formatted}%`;
}

function absolutePercentage(value: string | null | undefined): string {
  const formatted = formatPercentageChange(value);
  return formatted.replace(/^[-−+]/, "");
}

export function humanizeDataHealthFinding(finding: DataHealthFinding): HumanizedFinding {
  switch (finding.code) {
    case "COMMERCE_SOURCE_ABSENT":
      return {
        title: "Shopify data isn’t included",
        description: "Paid-media performance is available, but store revenue and MER are unavailable.",
        action: "Add Shopify CSV",
        finding,
      };
    case "EXPECTED_SOURCE_MISSING":
    case "EXPECTED_SOURCE_NO_USABLE_CURRENT_OBSERVATIONS":
      return {
        title: `${finding.source ? SOURCE_LABELS[finding.source] : "A selected source"} needs data`,
        description: "Add a current export for the selected reporting period.",
        action: "Update data",
        finding,
      };
    case "PARTIAL_CURRENT_PERIOD_COVERAGE":
    case "MISSING_ADVERTISING_DAILY_COVERAGE":
      return {
        title: `${finding.source ? SOURCE_LABELS[finding.source] : "Source"} coverage needs review`,
        description: "The export does not cover every expected day in the reporting period.",
        action: "Upload an updated export",
        finding,
      };
    case "CROSS_SOURCE_CURRENCY_MISMATCH":
    case "SOURCE_MIXED_CURRENCIES":
      return {
        title: "Currencies can’t be combined",
        description: "Relay does not convert currencies. Use exports with one matching currency.",
        action: "Review source files",
        finding,
      };
    default:
      return {
        title: finding.blocking ? "Data needs correction" : "Data quality needs review",
        description: finding.message,
        action: finding.blocking ? "Review details" : null,
        finding,
      };
  }
}

function movementVerb(observation: ChangeObservation): string {
  if (observation.direction === "increased") return "increased";
  if (observation.direction === "decreased") return "decreased";
  if (observation.direction === "unchanged") return "was unchanged";
  return "change is unavailable";
}

export function presentObservation(observation: ChangeObservation): PresentedObservation {
  const source = observation.source ? `${SOURCE_LABELS[observation.source]} ` : "";
  const percent = absolutePercentage(observation.percentageChange);
  if (observation.type === "TARGET_BREACH") {
    return {
      title: `${METRIC_LABELS[observation.metric]} is outside target`,
      detail: `${source}${METRIC_LABELS[observation.metric]} needs attention for this period.`,
      tone: "unfavorable",
      observation,
    };
  }
  if (observation.metric === "cpa" || observation.type.includes("EFFICIENCY")) {
    const declined = observation.assessment === "unfavorable";
    return {
      title: declined ? "Efficiency declined" : "Efficiency improved",
      detail: `${source}${METRIC_LABELS[observation.metric]} ${movementVerb(observation)}${percent === "—" ? "" : ` ${percent}`}.`,
      tone: observation.assessment,
      observation,
    };
  }
  return {
    title: `${METRIC_LABELS[observation.metric]} ${observation.direction === "decreased" ? "softened" : observation.direction === "increased" ? "grew" : "held steady"}`,
    detail: `${source}${METRIC_LABELS[observation.metric]} ${movementVerb(observation)}${percent === "—" ? "" : ` ${percent}`}.`,
    tone: observation.assessment,
    observation,
  };
}

function storyKey(observation: ChangeObservation): string {
  if (observation.type === "TARGET_BREACH") return `target:${observation.target?.id ?? observation.id}`;
  if (
    observation.type === "SOURCE_EFFICIENCY_IMPROVEMENT"
    || observation.type === "SOURCE_EFFICIENCY_DETERIORATION"
    || (observation.source && (observation.metric === "cpa" || observation.metric === "roas"))
  ) return `efficiency:${observation.source ?? "report"}`;
  if (observation.type === "SPEND_REVENUE_DIVERGENCE" || observation.metric === "mer") return "commerce-efficiency";
  return `${observation.scope}:${observation.source ?? "report"}:${observation.metric}`;
}

export function curateObservations(observations: ChangeObservation[], limit = 4): ChangeObservation[] {
  const sorted = observations.map((item, index) => ({ item, index }))
    .sort((left, right) => right.item.priority - left.item.priority || left.index - right.index);
  const keys = new Set<string>();
  const curated: ChangeObservation[] = [];
  for (const { item } of sorted) {
    const key = storyKey(item);
    if (keys.has(key)) continue;
    keys.add(key);
    curated.push(item);
    if (curated.length === limit) break;
  }
  return curated;
}
