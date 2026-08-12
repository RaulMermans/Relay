import { DataHealthInputError, type DateRange, type ReportingPeriod, type ResolvedReportingPeriod } from "./types";

function calendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

export function isCanonicalDate(value: unknown): value is string {
  return typeof value === "string" && calendarDate(value) !== null;
}

function assertRange(range: DateRange): void {
  const start = calendarDate(range.start);
  const end = calendarDate(range.end);
  if (!start || !end || start > end) {
    throw new DataHealthInputError("INVALID_REPORTING_PERIOD", "The reporting period is invalid.");
  }
}

function daysInclusive(range: DateRange): number {
  const start = calendarDate(range.start);
  const end = calendarDate(range.end);
  if (!start || !end) throw new DataHealthInputError("INVALID_REPORTING_PERIOD", "The reporting period is invalid.");
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

function shiftDate(value: string, days: number): string {
  const date = calendarDate(value);
  if (!date) throw new DataHealthInputError("INVALID_REPORTING_PERIOD", "The reporting period is invalid.");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function resolveReportingPeriod(input: ReportingPeriod): {
  reportingPeriod: ResolvedReportingPeriod;
  comparisonIssues: Array<"COMPARISON_PERIOD_LENGTH_MISMATCH" | "COMPARISON_PERIOD_NOT_PREVIOUS">;
} {
  assertRange(input.currentPeriod);
  const currentLength = daysInclusive(input.currentPeriod);
  const derivedComparison: DateRange = {
    start: shiftDate(input.currentPeriod.start, -currentLength),
    end: shiftDate(input.currentPeriod.start, -1),
  };

  if (!input.comparisonPeriod) {
    return { reportingPeriod: { currentPeriod: input.currentPeriod, comparisonPeriod: derivedComparison }, comparisonIssues: [] };
  }

  assertRange(input.comparisonPeriod);
  const comparisonIssues: Array<"COMPARISON_PERIOD_LENGTH_MISMATCH" | "COMPARISON_PERIOD_NOT_PREVIOUS"> = [];
  if (daysInclusive(input.comparisonPeriod) !== currentLength) comparisonIssues.push("COMPARISON_PERIOD_LENGTH_MISMATCH");
  if (
    input.comparisonPeriod.start !== derivedComparison.start ||
    input.comparisonPeriod.end !== derivedComparison.end
  ) {
    comparisonIssues.push("COMPARISON_PERIOD_NOT_PREVIOUS");
  }
  return { reportingPeriod: { currentPeriod: input.currentPeriod, comparisonPeriod: input.comparisonPeriod }, comparisonIssues };
}

export function dateInRange(date: string, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

export function enumerateDates(start: string, end: string): string[] {
  const dates: string[] = [];
  for (let current = start; current <= end; current = shiftDate(current, 1)) dates.push(current);
  return dates;
}
