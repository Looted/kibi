import { z } from "zod";

export const ResultSchema = z.object({
  status: z.enum(["qualified", "no-go"]),
  code: z.string(),
  reasons: z.array(
    z.object({ check: z.string(), expected: z.unknown() }).loose(),
  ),
  lockDigests: z.object({
    sandbox: z.string(),
    provider: z.string(),
    verifier: z.string(),
  }),
  expected: z.object({
    launcher: z.literal("/usr/libexec/kibi-skillopt-verifier-launch"),
    installerCommand: z.literal(
      "sudo /usr/libexec/kibi-skillopt-installer install --bundle <signed-bundle> --version kibi-skillopt-trust-v1",
    ),
    identities: z.array(z.string()),
    fdInventory: z.array(z.string()),
  }),
  checks: z.array(z.object({ name: z.string(), status: z.literal("pass") })),
  verifierAttestation: z.object({ signature: z.string().min(1) }),
  paidModelCalls: z.literal(0),
  runtimeAuthorized: z.literal(false),
});
