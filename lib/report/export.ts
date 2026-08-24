import type { AnalysisSnapshot } from "../persistence/types";
import { isReportStale } from "./compose";
import type { ReportDocument } from "./types";

export type ReportPrint = () => void;

export function canExportReport(report: ReportDocument | null, snapshot: AnalysisSnapshot | undefined): boolean {
  return report !== null && snapshot?.dataHealth.status !== "blocked" && !isReportStale(report, snapshot);
}

export function exportReport(
  report: ReportDocument | null,
  snapshot: AnalysisSnapshot | undefined,
  print: ReportPrint,
): boolean {
  if (!canExportReport(report, snapshot)) return false;
  print();
  return true;
}
