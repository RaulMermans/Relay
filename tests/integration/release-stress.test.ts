import { describe, expect, it } from "vitest";

import { MAX_CSV_DATA_ROWS } from "../../lib/intake/csv/parse";
import { analyzeWorkspace } from "../../lib/workspace/analyze-workspace";

function maxRowMetaFixture(): File {
  const rows = Array.from(
    { length: MAX_CSV_DATA_ROWS },
    (_, index) => `2026-08-01,act-${index},campaign-${index},Campaign ${index},1.23,2.34,USD`,
  );
  return new File([
    "Date start,Account ID,Campaign ID,Campaign name,Amount spent,Purchase conversion value,Currency\n",
    `${rows.join("\n")}\n`,
  ], "synthetic-max-meta.csv", { type: "text/csv" });
}

describe("release stress boundary", () => {
  it("analyzes a maximum supported synthetic CSV within the local beta budget", async () => {
    const startedAt = performance.now();
    const result = await analyzeWorkspace({
      files: { meta_ads: maxRowMetaFixture() },
      expectedSources: ["meta_ads"],
      reportingPeriod: { currentPeriod: { start: "2026-08-01", end: "2026-08-01" } },
      targets: [],
      ingestionId: () => "release-stress",
    });

    expect(result).toMatchObject({ status: "ready" });
    if (result.status === "ready") expect(result.sources[0]?.normalizedRowCount).toBe(MAX_CSV_DATA_ROWS);
    expect(performance.now() - startedAt).toBeLessThan(10_000);
  }, 15_000);
});
