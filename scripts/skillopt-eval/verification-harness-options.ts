import { sep } from "node:path";
import { z } from "zod";
import { CANONICAL_SKILLS } from "./catalog";

const CliSchema = z
  .object({
    skill: z.enum(CANONICAL_SKILLS),
    runId: z.uuid(),
    artifactRoot: z.string().min(1),
    targetRoot: z.string().min(1),
    rootAuthorization: z.string().min(1),
    preparedRoot: z.string().min(1),
    preflightReceipt: z.string().min(1),
    verificationParent: z.string().min(1),
    output: z.string().min(1),
  })
  .strict();

export type VerificationHarnessCliOptions = z.infer<typeof CliSchema>;

export class VerificationHarnessOptionsError extends Error {
  readonly name = "VerificationHarnessOptionsError";

  constructor(readonly check: "cli-arguments" | "path-traversal") {
    super(check);
  }
}

export function hasTraversal(path: string): boolean {
  return path.split(sep).includes("..");
}

export function parseVerificationHarnessCli(
  argv: readonly string[],
): VerificationHarnessCliOptions {
  if (argv.length !== 18)
    throw new VerificationHarnessOptionsError("cli-arguments");
  const values: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === undefined || value === undefined || !flag.startsWith("--"))
      throw new VerificationHarnessOptionsError("cli-arguments");
    const key = flag.slice(2);
    if (
      ![
        "skill",
        "run-id",
        "artifact-root",
        "target-root",
        "root-authorization",
        "prepared-root",
        "preflight-receipt",
        "verification-parent",
        "output",
      ].includes(key) ||
      values[key] !== undefined
    ) {
      throw new VerificationHarnessOptionsError("cli-arguments");
    }
    values[key] = value;
  }
  const pathValues = [
    values["artifact-root"],
    values["target-root"],
    values["root-authorization"],
    values["prepared-root"],
    values["preflight-receipt"],
    values["verification-parent"],
    values.output,
  ];
  if (pathValues.some((path) => path === undefined || hasTraversal(path)))
    throw new VerificationHarnessOptionsError("path-traversal");
  return CliSchema.parse({
    skill: values.skill,
    runId: values["run-id"],
    artifactRoot: values["artifact-root"],
    targetRoot: values["target-root"],
    rootAuthorization: values["root-authorization"],
    preparedRoot: values["prepared-root"],
    preflightReceipt: values["preflight-receipt"],
    verificationParent: values["verification-parent"],
    output: values.output,
  });
}
