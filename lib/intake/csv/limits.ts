export const MAX_CSV_FILE_SIZE_BYTES = 5 * 1024 * 1024;
/** Allows multipart framing and bounded auxiliary form fields around one CSV upload. */
export const MAX_CSV_UPLOAD_REQUEST_SIZE_BYTES = MAX_CSV_FILE_SIZE_BYTES + 128 * 1024;
/** A workspace accepts at most one bounded CSV for each of the three supported sources. */
export const MAX_WORKSPACE_REQUEST_SIZE_BYTES = (MAX_CSV_FILE_SIZE_BYTES * 3) + 256 * 1024;

export function exceedsDeclaredRequestSize(request: Request, maximumBytes: number): boolean {
  const contentLength = request.headers.get("content-length");
  if (contentLength === null) return false;
  if (!/^\d+$/.test(contentLength)) return true;
  return Number(contentLength) > maximumBytes;
}
