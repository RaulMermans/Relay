import { validateServerEnvironment } from "../../../lib/env/server";
import { createHealthResponse } from "../../../lib/health";

export const dynamic = "force-dynamic";

export function GET(): Response {
  validateServerEnvironment();

  return Response.json(createHealthResponse(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
