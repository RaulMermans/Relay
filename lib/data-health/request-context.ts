import { z } from "zod";

import type { MappingProposal } from "../mapping/types";
import type { AdvertisingObservation, CommerceObservation } from "../normalization/types";
import { resolveReportingPeriod } from "./reporting-period";
import { DataHealthInputError, type DataHealthInput } from "./types";

const dataHealthContextSchema = z
  .object({
    currentPeriod: z.object({ start: z.string(), end: z.string() }).strict().optional(),
    comparisonPeriod: z.object({ start: z.string(), end: z.string() }).strict().optional(),
    expectedSources: z.array(z.enum(["meta_ads", "google_ads", "shopify"])).optional(),
  })
  .strict();

const MAX_CONTEXT_CHARACTERS = 16_384;

function derivedCurrentPeriod(observations: Array<AdvertisingObservation | CommerceObservation>): { start: string; end: string } {
  const dates = observations.map((observation) => observation.date).sort();
  const start = dates[0];
  const end = dates[dates.length - 1];
  if (!start || !end) {
    throw new DataHealthInputError("INVALID_REPORTING_PERIOD", "The reporting period is invalid.");
  }
  return { start, end };
}

export function createDataHealthInput(
  value: FormDataEntryValue | null,
  normalized: {
    provider: "meta_ads" | "google_ads" | "shopify";
    observations: Array<AdvertisingObservation | CommerceObservation>;
    mapping: MappingProposal;
  },
): DataHealthInput {
  if (value !== null && (typeof value !== "string" || value.length > MAX_CONTEXT_CHARACTERS)) {
    throw new DataHealthInputError("INVALID_REPORTING_PERIOD", "The reporting period is invalid.");
  }
  let parsed: z.infer<typeof dataHealthContextSchema> = {};
  if (typeof value === "string") {
    try {
      const decoded: unknown = JSON.parse(value);
      const result = dataHealthContextSchema.safeParse(decoded);
      if (!result.success) {
        throw new DataHealthInputError("INVALID_REPORTING_PERIOD", "The reporting period is invalid.");
      }
      parsed = result.data;
    } catch (error) {
      if (error instanceof DataHealthInputError) throw error;
      throw new DataHealthInputError("INVALID_REPORTING_PERIOD", "The reporting period is invalid.");
    }
  }
  const input: DataHealthInput = {
    observations: normalized.observations,
    reportingPeriod: {
      currentPeriod: parsed.currentPeriod ?? derivedCurrentPeriod(normalized.observations),
      comparisonPeriod: parsed.comparisonPeriod,
    },
    expectedSources: parsed.expectedSources ?? [normalized.provider],
    sourceInputs: [{ source: normalized.provider, mapping: normalized.mapping }],
  };
  resolveReportingPeriod(input.reportingPeriod);
  return input;
}
