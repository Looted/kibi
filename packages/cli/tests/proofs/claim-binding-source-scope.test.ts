import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  environmentGetterCallee,
  judgeClaimBindings,
  namedClaimFiles,
} from "../../src/operations/proof/claim-bindings.js";
import type { CertificateVerdict } from "../../src/operations/proof/code-certificates.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";
import type { ProofContract } from "../../src/public/proof-protocol.js";

// implements REQ-kibi-source-proof-kinds

const root = mkdtempSync(path.join(tmpdir(), "kibi-claim-source-scope-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
mkdirSync(path.join(root, "src"), { recursive: true });
for (const file of ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts", "skip.ts"])
  writeFileSync(path.join(root, "src", file), "export const x = 1;\n");
mkdirSync(path.join(root, "with space"), { recursive: true });
writeFileSync(path.join(root, "with space", "run.sh"), "echo hi\n");

const CLAIM = "CLAIM-0000000000000S01";
const REQ = "REQ-SCOPE";

/** The claim's fact (subject key and claim text); undefined: not in the KB. */
let factRow: { subject: string; claim: string } | undefined;

/** Where each symbol's source lies; a symbol missing here is not in the KB. */
const SYMBOL_FILES: Record<string, string> = {
  "SYM-A": "src/a.ts",
  "SYM-A2": "src/a.ts",
  "SYM-B": "src/b.ts",
  "SYM-C": "src/c.ts",
  "SYM-D": "src/d.ts",
  "SYM-E": "src/e.ts",
  "SYM-SKIP": "src/skip.ts",
};

function contextWith(
  implementers: readonly string[],
  operator = "eq",
  implementsQuery: "ok" | "fail" | "fail-silent" = "ok",
): OperationContext {
  return {
    workspaceRoot: root,
    prolog: {
      oneShotMode: true,
      query: async (goal: string) => {
        if (goal.includes("test_claim_obligations_json"))
          return {
            success: true,
            bindings: {
              JsonString: JSON.stringify([
                {
                  claim_key: CLAIM,
                  requirement_id: REQ,
                  fact_id: "FACT-SCOPE",
                  result: "obligation",
                  obligation: {
                    kind: "string_constraint",
                    operator,
                    value: "KIBI_HOME",
                  },
                },
              ]),
            },
          };
        if (goal.includes("kb_relationship(implements")) {
          if (implementsQuery === "fail")
            return { success: false, bindings: {}, error: "no kb" };
          if (implementsQuery === "fail-silent")
            return { success: false, bindings: {} };
          return {
            success: true,
            bindings: {
              Rels: `[${implementers.map((id) => `['${id}','${REQ}',implements]`).join(",")}]`,
            },
          };
        }
        const id = /kb_entity\('([^']+)'/.exec(goal)?.[1] ?? "";
        if (id === "FACT-SCOPE")
          return {
            success: true,
            bindings: {
              Results:
                factRow === undefined
                  ? "[]"
                  : `[['${id}',fact,[subject_key="${factRow.subject}",claim_text="${factRow.claim}"]]]`,
            },
          };
        const file = SYMBOL_FILES[id];
        return {
          success: true,
          bindings: {
            Results:
              file === undefined
                ? "[]"
                : `[['${id}',symbol,[title="x",sourceFile="${file}"]]]`,
          },
        };
      },
    },
  } as unknown as OperationContext;
}

function referencesContract(source: Record<string, unknown>): ProofContract {
  return {
    version: "kibi.proof-contract.v1",
    integration: "self-proof",
    required_proofs: [{ symbol_id: "SYM-PROOF", target: "default" }],
    success_policy: "all_required_first_attempt",
    kind: "source",
    source: { reader: "references", extract: "env", ...source },
    proves: [CLAIM],
  } as unknown as ProofContract;
}

const verdict = {
  kind: "source",
  evidence_level: "proved",
  certificate: { pattern: { type: "string", value: "KIBI_HOME" } },
} as unknown as CertificateVerdict;

async function judge(
  context: OperationContext,
  contract: ProofContract,
  coveredBySymbols: readonly string[],
) {
  const bindings = await judgeClaimBindings(context, {
    testId: "TEST-SCOPE",
    contract,
    verdict,
    coveredBySymbols,
  });
  expect(bindings).toHaveLength(1);
  return bindings?.[0];
}

describe("a references read covers the code its claims are about", () => {
  test("derives the claim when every covered and implementing symbol lies in a read file", async () => {
    const binding = await judge(
      contextWith(["SYM-A2", "SYM-UNKNOWN"]),
      referencesContract({ files: "src/a.ts" }),
      ["SYM-A"],
    );
    // SYM-UNKNOWN has no source file in the KB, so it constrains nothing.
    expect(binding).toMatchObject({ binding: "derived", scope: "source" });
  });

  test("rejects the claim when a covered or implementing symbol lies outside the read", async () => {
    const binding = await judge(
      contextWith(["SYM-B", "SYM-A"]),
      referencesContract({ files: ["src/a.ts", 7] }),
      ["SYM-A", "SYM-B"],
    );
    // SYM-B is both covered and implementing; it is named once.
    expect(binding).toMatchObject({
      binding: "rejected",
      reason:
        "the read does not cover the code the claim is about: SYM-B (src/b.ts) is covered by the test. Kibi decides the claim only on the files it reads, so add those files to files; if Kibi cannot read them, the claim cannot be decided for them",
    });
  });

  test("names at most three symbols outside the read and counts the rest", async () => {
    const binding = await judge(
      contextWith(["SYM-C", "SYM-D", "SYM-E", "SYM-SKIP"]),
      referencesContract({ files: ["src/*.ts"], ignore: "src/skip.ts" }),
      ["SYM-B"],
    );
    // src/b.ts is read; src/skip.ts is ignored, so SYM-SKIP lies outside.
    expect(binding?.binding).toBe("rejected");
    expect(binding?.reason).toStartWith(
      "the read does not cover the code the claim is about: SYM-SKIP (src/skip.ts) implements REQ-SCOPE.",
    );

    const many = await judge(
      contextWith(["SYM-C", "SYM-D", "SYM-E"]),
      referencesContract({ files: ["src/a.ts"] }),
      ["SYM-B"],
    );
    expect(many?.reason).toStartWith(
      "the read does not cover the code the claim is about: SYM-B (src/b.ts) is covered by the test; SYM-C (src/c.ts) implements REQ-SCOPE; SYM-D (src/d.ts) implements REQ-SCOPE and 1 more.",
    );
  });

  test("a string_args read of an environment getter cannot decide a closed claim", async () => {
    const getterRead = referencesContract({
      files: ["src/a.ts"],
      extract: "string_args",
      callee: "process.env",
    });
    for (const operator of ["eq", "subset_of", "excludes"]) {
      const binding = await judge(contextWith([], operator), getterRead, [
        "SYM-A",
      ]);
      expect(binding).toMatchObject({
        binding: "rejected",
        reason: `a string_args read of process.env sees only that getter's arguments, not the other ways the code reads the environment, so it cannot decide a ${operator} claim; read the files with extract env`,
      });
    }
    // An open claim is decided by the getter's own arguments.
    const open = await judge(contextWith([], "neq"), getterRead, ["SYM-A"]);
    expect(open?.reason ?? "").not.toContain("string_args read");
    // A string_args read of any other callee is not limited this way.
    const other = await judge(
      contextWith([]),
      referencesContract({
        files: ["src/a.ts"],
        extract: "string_args",
        callee: "fetch",
      }),
      ["SYM-A"],
    );
    expect(other).toMatchObject({ binding: "derived", scope: "source" });
  });

  test("fails loudly when the implements relationships cannot be read", async () => {
    const contract = referencesContract({ files: ["src/a.ts"] });
    await expect(
      judge(contextWith([], "eq", "fail"), contract, ["SYM-A"]),
    ).rejects.toThrow("implements relationship query failed: no kb");
    await expect(
      judge(contextWith([], "eq", "fail-silent"), contract, ["SYM-A"]),
    ).rejects.toThrow("implements relationship query failed: Unknown error");
  });
});

describe("a references read includes the files its claim names", () => {
  afterAll(() => {
    factRow = undefined;
  });

  test("rejects a claim about a file the read does not include", async () => {
    factRow = { subject: "b.ts", claim: "src/b.ts never reads KIBI_HOME" };
    const binding = await judge(
      contextWith([]),
      referencesContract({ files: ["src/a.ts"] }),
      [],
    );
    expect(binding).toMatchObject({
      binding: "rejected",
      reason:
        "the claim is about b.ts (src/b.ts), which the read does not include. Kibi decides the claim only on the files it reads, so add that file to files; if Kibi cannot read it, the claim cannot be decided",
    });
  });

  test("derives the claim when the named file is read", async () => {
    factRow = { subject: "b.ts", claim: "./src/b.ts never reads KIBI_HOME." };
    const binding = await judge(
      contextWith([]),
      referencesContract({ files: ["src/b.ts"] }),
      [],
    );
    expect(binding).toMatchObject({ binding: "derived", scope: "source" });
  });

  test("ignores names that are no project file", async () => {
    factRow = { subject: "kibi.cli", claim: "kibi.cli never reads missing.ts" };
    const binding = await judge(
      contextWith([]),
      referencesContract({ files: ["src/a.ts"] }),
      [],
    );
    expect(binding).toMatchObject({ binding: "derived", scope: "source" });
  });

  test("resolves a path first, then a file name anywhere in the project", () => {
    expect([
      ...namedClaimFiles(root, ["src/c.ts and d.ts", "src/c.ts", "*.ts", "x"]),
    ]).toEqual([
      ["src/c.ts", ["src/c.ts"]],
      ["d.ts", ["src/d.ts"]],
    ]);
  });

  test("resolves a repository prefix, other case, a missing extension and spaces", () => {
    expect([...namedClaimFiles(root, ["repo/src/e.ts"])]).toEqual([
      ["repo/src/e.ts", ["src/e.ts"]],
    ]);
    expect([...namedClaimFiles(root, ["SRC/E.TS"])]).toEqual([
      ["SRC/E.TS", ["src/e.ts"]],
    ]);
    expect([...namedClaimFiles(root, ["src/skip never runs"])]).toEqual([
      ["src/skip", ["src/skip.ts"]],
    ]);
    expect(
      namedClaimFiles(root, ["`with space/run.sh` never calls eval"]).get(
        "with space/run.sh",
      ),
    ).toEqual(["with space/run.sh"]);
    expect([...namedClaimFiles(root, ["kibi.cli", "os/exec"])]).toEqual([]);
  });
});

describe("environment getter callees", () => {
  test("names the callees that read one environment variable", () => {
    for (const callee of [
      "getenv",
      "os.Getenv",
      "os.LookupEnv",
      "Environment.GetEnvironmentVariable",
      "std::env::var",
      "env::var_os",
      "os.environ.get",
      "ENV.fetch",
      "process.env",
      "getenv/1",
      "os . getenv",
    ])
      expect(environmentGetterCallee(callee)).toBe(true);
    for (const callee of ["fetch", "mygetenv", "os.environ", "getenv.call", ""])
      expect(environmentGetterCallee(callee)).toBe(false);
  });
});
