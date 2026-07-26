import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import {
  EXTERNAL_PROVISIONING_COMMAND,
  ExternalPrerequisiteMissingError,
  requireExternalTrustPlane,
} from "./external-trust-client";

const CliSchema = z
  .object({ fixtureRoot: z.string().min(1).optional() })
  .strict();

class ExternalTrustCliInputError extends Error {
  readonly name = "ExternalTrustCliInputError";
}

function parseCli(argv: readonly string[]) {
  if (argv.length === 0) return CliSchema.parse({});
  if (
    argv.length !== 2 ||
    argv[0] !== "--fixture-root" ||
    process.env.KIBI_SKILLOPT_TEST_FIXTURE !== "1"
  ) {
    throw new ExternalTrustCliInputError();
  }
  return CliSchema.parse({ fixtureRoot: argv[1] });
}

function noActivityReceipt(error: ExternalPrerequisiteMissingError) {
  return {
    code: error.code,
    missing: error.missing,
    installerCommand: EXTERNAL_PROVISIONING_COMMAND,
    processSpawned: false,
    providerContacted: false,
    ledgerWritten: false,
  };
}

export async function externalTrustClientMain(
  argv: readonly string[],
): Promise<number> {
  const options = parseCli(argv);
  try {
    const receipt = await requireExternalTrustPlane({
      isReadable: async (path) => {
        const target =
          options.fixtureRoot === undefined
            ? path
            : join(options.fixtureRoot, path.slice(1));
        try {
          await access(target, constants.R_OK);
          return true;
        } catch (error) {
          if (
            error instanceof Error &&
            "code" in error &&
            (error.code === "ENOENT" || error.code === "EACCES")
          ) {
            return false;
          }
          throw error;
        }
      },
    });
    process.stdout.write(`${JSON.stringify(receipt)}\n`);
    return 0;
  } catch (error) {
    if (error instanceof ExternalPrerequisiteMissingError) {
      process.stderr.write(`${JSON.stringify(noActivityReceipt(error))}\n`);
      return 78;
    }
    throw error;
  }
}

if (import.meta.main) {
  externalTrustClientMain(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      const code =
        error instanceof ExternalTrustCliInputError ||
        error instanceof z.ZodError
          ? "CLIENT_INPUT_INVALID"
          : "CLIENT_FAILURE";
      process.stderr.write(`${JSON.stringify({ code })}\n`);
      process.exitCode = 64;
    });
}
