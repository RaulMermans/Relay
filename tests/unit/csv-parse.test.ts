import { describe, expect, it } from "vitest";

import { MAX_CSV_COLUMNS, MAX_CSV_DATA_ROWS, MAX_CSV_FIELD_CHARACTERS, parseCsv } from "../../lib/intake/csv/parse";

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

  it("rejects excessive CSV columns before they can create an unbounded mapping UI", () => {
    const headers = Array.from({ length: MAX_CSV_COLUMNS + 1 }, (_, index) => `Column ${index}`).join(",");

    try {
      parseCsv(`${headers}\n${headers}\n`);
      throw new Error("Expected column limit to fail.");
    } catch (error) {
      expect(error).toMatchObject({ code: "CSV_TOO_MANY_COLUMNS" });
    }
  });

  it("rejects an unexpected field length without echoing its contents", () => {
    try {
      parseCsv(`Campaign\n${"x".repeat(MAX_CSV_FIELD_CHARACTERS + 1)}\n`);
      throw new Error("Expected field length limit to fail.");
    } catch (error) {
      expect(error).toMatchObject({ code: "CSV_FIELD_TOO_LARGE" });
    }
  });

  it("rejects duplicate normalized headers before mapping and preserves formula-like text as inert data", () => {
    expect(() => parseCsv("Campaign, campaign ,Spend\nA,B,=1+1\n")).toThrow(expect.objectContaining({ code: "CSV_DUPLICATE_HEADERS" }));
    expect(parseCsv("Campaign,Spend\n=1+1,2\n").rows[0]?.[0]).toBe("=1+1");
  });

  it("rejects null bytes while accepting a UTF-8 BOM and mixed newline forms", () => {
    expect(() => parseCsv("Campaign,Spend\nA,1\0\n")).toThrow(expect.objectContaining({ code: "CSV_NULL_BYTE" }));
    expect(parseCsv("\uFEFFCampaign,Spend\r\nA,1\nB,2\r\n").rowCount).toBe(2);
  });
});
