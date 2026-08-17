import { randomUUID } from "node:crypto";

import { z } from "zod";

import { ChangeIntelligenceInputError, parseChangeTargets } from "../../../../lib/change-intelligence/targets";
import { DataHealthInputError, type ProviderSource } from "../../../../lib/data-health/types";
import { type MappingOverride, MappingError } from "../../../../lib/mapping/field-mapping";
import { WorkspaceAnalysisError, analyzeWorkspace } from "../../../../lib/workspace/analyze-workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const sourceSchema = z.enum(["meta_ads", "google_ads", "shopify"]);
const overrideSchema = z.object({ columnIndex: z.number().int().nonnegative(), canonicalField: z.string().nullable() }).strict();
const contextSchema = z.object({
  currentPeriod: z.object({ start: z.string(), end: z.string() }).strict(),
  expectedSources: z.array(sourceSchema).min(1).max(3).refine((items) => new Set(items).size === items.length),
  mappingOverrides: z.object({
    meta_ads: z.array(overrideSchema).optional(),
    google_ads: z.array(overrideSchema).optional(),
    shopify: z.array(overrideSchema).optional(),
  }).strict().optional(),
}).strict();

const MAX_CONTEXT_CHARACTERS = 65_536;

function uploadedFile(value: FormDataEntryValue | null): File | undefined {
  if (value === null) return undefined;
  if (typeof value === "string" || typeof value.arrayBuffer !== "function") {
    throw new WorkspaceAnalysisError("WORKSPACE_FILE_MISSING", "The workspace file request is invalid.");
  }
  return value;
}

function parseContext(value: FormDataEntryValue | null): z.infer<typeof contextSchema> {
  if (typeof value !== "string" || value.length > MAX_CONTEXT_CHARACTERS) {
    throw new DataHealthInputError("INVALID_REPORTING_PERIOD", "The workspace context is invalid.");
  }
  try {
    const result = contextSchema.safeParse(JSON.parse(value) as unknown);
    if (!result.success) throw new Error("invalid");
    return result.data;
  } catch {
    throw new DataHealthInputError("INVALID_REPORTING_PERIOD", "The workspace context is invalid.");
  }
}

function rejected(code: string, message: string): Response {
  return Response.json({ status: "rejected", error: { code, message } }, {
    status: 400,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const context = parseContext(formData.get("workspaceContext"));
    const files = {
      meta_ads: uploadedFile(formData.get("meta_ads")),
      google_ads: uploadedFile(formData.get("google_ads")),
      shopify: uploadedFile(formData.get("shopify")),
    };
    const result = await analyzeWorkspace({
      files,
      expectedSources: context.expectedSources,
      reportingPeriod: { currentPeriod: context.currentPeriod },
      mappingOverrides: context.mappingOverrides as Partial<Record<ProviderSource, MappingOverride[]>> | undefined,
      targets: parseChangeTargets(formData.get("changeTargets")),
      ingestionId: () => randomUUID(),
    });
    console.info("workspace_analysis_processed", {
      status: result.status,
      sources: result.status === "ready" ? result.sources.map((source) => source.source) : result.exceptions.map((item) => item.source),
      dataHealthStatus: result.status === "ready" ? result.dataHealth.status : undefined,
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof DataHealthInputError) {
      return rejected("INVALID_WORKSPACE_REQUEST", "The workspace analysis request is invalid.");
    }
    if (error instanceof ChangeIntelligenceInputError) {
      return rejected("INVALID_CHANGE_INTELLIGENCE_TARGETS", "The Change Intelligence target request is invalid.");
    }
    if (error instanceof WorkspaceAnalysisError) return rejected(error.code, error.message);
    if (error instanceof MappingError) return rejected(error.code, error.message);
    const safeCode = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
      ? error.code
      : "WORKSPACE_ANALYSIS_FAILED";
    console.warn("workspace_analysis_rejected", { code: safeCode });
    return rejected(safeCode, "The workspace could not be analyzed safely.");
  }
}
