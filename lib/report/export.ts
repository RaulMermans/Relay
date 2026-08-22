import { reportFilename } from "./compose";
import type { ReportDocument } from "./types";

export type PrintBoundary = {
  getTitle: () => string;
  setTitle: (title: string) => void;
  print: () => void;
  defer: (callback: () => void) => void;
};

function browserPrintBoundary(): PrintBoundary {
  return {
    getTitle: () => window.document.title,
    setTitle: (title) => { window.document.title = title; },
    print: () => window.print(),
    defer: (callback) => window.setTimeout(callback, 0),
  };
}

/** Invokes the browser-owned print flow for a current report snapshot only. */
export function exportReport(document: ReportDocument, stale: boolean, boundary: PrintBoundary = browserPrintBoundary()): boolean {
  if (stale) return false;
  const previousTitle = boundary.getTitle();
  boundary.setTitle(reportFilename(document).replace(/\.pdf$/i, ""));
  boundary.print();
  boundary.defer(() => boundary.setTitle(previousTitle));
  return true;
}
