import { describe, expect, it } from "vitest";

import {
  MAX_CSV_FILE_SIZE_BYTES,
  validateCsvFile,
} from "../../lib/intake/csv/validate";

describe("validateCsvFile", () => {
  it("accepts a non-empty textual CSV file and returns safe metadata", async () => {
    const file = new File(["Campaign,Spend\nEvergreen,0\n"], "meta-week.csv", {
      type: "text/csv",
    });

    await expect(validateCsvFile(file)).resolves.toEqual({
      name: "meta-week.csv",
      sizeBytes: file.size,
      content: "Campaign,Spend\nEvergreen,0\n",
    });
  });

  it.each([
    [new File([], "empty.csv", { type: "text/csv" }), "FILE_EMPTY"],
    [new File(["Campaign,Spend\n"], "export.txt", { type: "text/plain" }), "INVALID_FILE_TYPE"],
    [new File(["Campaign,Spend\n"], "export.csv", { type: "application/json" }), "INVALID_FILE_TYPE"],
    [
      new File([new Uint8Array(MAX_CSV_FILE_SIZE_BYTES + 1)], "large.csv", { type: "text/csv" }),
      "FILE_TOO_LARGE",
    ],
    [new File([new Uint8Array([0xc3, 0x28])], "invalid-text.csv", { type: "text/csv" }), "CSV_PARSE_ERROR"],
  ] as const)("rejects invalid files with %s", async (file, code) => {
    await expect(validateCsvFile(file)).rejects.toMatchObject({ code });
  });

  it("rejects a missing file", async () => {
    await expect(validateCsvFile(null)).rejects.toMatchObject({ code: "FILE_MISSING" });
  });
});
