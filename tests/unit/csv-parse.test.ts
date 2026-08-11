import { describe, expect, it } from "vitest";

import { MAX_CSV_DATA_ROWS, parseCsv } from "../../lib/intake/csv/parse";

describe("parseCsv", () => {
  it("preserves quoted commas, escaped quotes, empty cells, and CRLF rows", () => {
    const result = parseCsv(
      'Campaign,Note,Spend\r\n"Summer, launch","A ""quoted"" note",123.45\r\nEvergreen,,0\r\n',
    );

    expect(result).toEqual({
      headers: ["Campaign", "Note", "Spend"],
      rows: [
        ["Summer, launch", 'A "quoted" note', "123.45"],
        ["Evergreen", "", "0"],
      ],
      rowCount: 2,
      delimiter: ",",
      parseWarnings: [],
    });
  });

  it("removes a UTF-8 BOM from the first header", () => {
    expect(parseCsv("\uFEFFCampaign,Spend\nEvergreen,0\n").headers).toEqual([
      "Campaign",
      "Spend",
    ]);
  });

  it("normalizes malformed CSV failures to the intake error code", () => {
    try {
      parseCsv('Campaign,Spend\n"Unclosed,100');
      throw new Error("Expected parsing to fail");
    } catch (error) {
      expect(error).toMatchObject({ code: "CSV_PARSE_ERROR" });
    }
  });

  it("rejects a CSV with more than the bounded number of data rows", () => {
    const dataRows = Array.from({ length: MAX_CSV_DATA_ROWS + 1 }, (_, index) => `row-${index}`).join(
      "\n",
    );

    try {
      parseCsv(`Campaign\n${dataRows}\n`);
      throw new Error("Expected parsing to fail");
    } catch (error) {
      expect(error).toMatchObject({ code: "CSV_TOO_MANY_ROWS" });
    }
  });
});
