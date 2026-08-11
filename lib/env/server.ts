import { z } from "zod";

const serverEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

type ServerEnvironmentInput = Record<string, string | undefined>;

export function validateServerEnvironment(
  environment: ServerEnvironmentInput = process.env,
): ServerEnvironment {
  const result = serverEnvironmentSchema.safeParse({
    NODE_ENV: environment.NODE_ENV,
  });

  if (!result.success) {
    throw new Error(
      "Invalid server environment: NODE_ENV must be development, test, or production.",
    );
  }

  return result.data;
}
