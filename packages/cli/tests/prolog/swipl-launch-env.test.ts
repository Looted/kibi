// executable_for TEST-prolog-bundled-runtime
import { afterEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrologProcess } from "../../src/prolog.js";
import type { ResolvedSwipl } from "../../src/prolog/swipl-resolver.js";

const roots: string[] = [];
const processes: PrologProcess[] = [];

afterEach(async () => {
  for (const process of processes.splice(0)) await process.terminate();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

/** A swipl stand-in that records the environment it was launched with. */
function recorder(): { bin: string; record: string; root: string } {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-launch-env-"));
  roots.push(root);
  const bin = path.join(root, "swipl");
  const record = path.join(root, "env.txt");
  writeFileSync(
    bin,
    `#!/bin/sh\nprintf 'home=%s\\n' "\${SWI_HOME_DIR:-<unset>}" > '${record}'\nsleep 1\n`,
  );
  chmodSync(bin, 0o755);
  return { bin, record, root };
}

function resolved(bin: string, home?: string): () => ResolvedSwipl {
  return () => ({
    bin,
    version: "10.0.2",
    source: home === undefined ? "path" : "bundled",
    ...(home === undefined ? {} : { home }),
  });
}

async function launchedHome(
  mode: "one-shot" | "interactive",
  home: string | undefined,
): Promise<string> {
  const fake = recorder();
  const prolog = new PrologProcess({
    swiplResolver: resolved(fake.bin, home),
    oneShot: mode === "one-shot",
    timeout: 3_000,
  });
  processes.push(prolog);
  if (mode === "one-shot") {
    await prolog.query("true").catch(() => undefined);
  } else {
    await prolog.start().catch(() => undefined);
  }
  expect(existsSync(fake.record)).toBe(true);
  return readFileSync(fake.record, "utf8").trim();
}

describe("PrologProcess launches the resolved SWI-Prolog", () => {
  test.each(["one-shot", "interactive"] as const)(
    "%s spawn passes SWI_HOME_DIR for a bundled build",
    async (mode) => {
      expect(await launchedHome(mode, "/bundle/lib/swipl")).toBe(
        "home=/bundle/lib/swipl",
      );
    },
  );

  test.each(["one-shot", "interactive"] as const)(
    "%s spawn leaves SWI_HOME_DIR to SWI-Prolog when the build has no home",
    async (mode) => {
      const previous = process.env.SWI_HOME_DIR;
      Reflect.deleteProperty(process.env, "SWI_HOME_DIR");
      try {
        expect(await launchedHome(mode, undefined)).toBe("home=<unset>");
      } finally {
        if (previous !== undefined) process.env.SWI_HOME_DIR = previous;
      }
    },
  );

  test("an explicit swiplPath bypasses the resolver", async () => {
    const fake = recorder();
    const prolog = new PrologProcess({
      swiplPath: fake.bin,
      swiplResolver: () => {
        throw new Error("resolver must not run for an explicit path");
      },
      oneShot: true,
      timeout: 3_000,
    });
    processes.push(prolog);
    await prolog.query("true").catch(() => undefined);
    expect(readFileSync(fake.record, "utf8").trim()).toBe("home=<unset>");
  });

  test("a resolver failure surfaces its remediation instead of spawning", async () => {
    const prolog = new PrologProcess({
      swiplResolver: () => {
        throw new Error("Kibi could not find a usable SWI-Prolog");
      },
      oneShot: true,
    });
    const result = await prolog.query("true");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Kibi could not find a usable SWI-Prolog");
    await expect(
      new PrologProcess({
        swiplResolver: () => {
          throw new Error("Kibi could not find a usable SWI-Prolog");
        },
        oneShot: false,
      }).start(),
    ).rejects.toThrow("Kibi could not find a usable SWI-Prolog");
  });
});
