import assert from "node:assert";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
  stageSourceFile,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

type QualityDiagnostic = {
  id: string;
  entityId?: string;
  blocking: boolean;
};

type CheckResult = {
  violations: { rule: string; entityId?: string }[];
  qualityDiagnostics: QualityDiagnostic[];
};

/**
 * E2E: the review rules that decide when kibi check asks a person to look at
 * a requirement, run through the packed CLI on a fixture KB.
 *
 * SCEN-kibi-broad-requirement-review, SCEN-NEG-kibi-broad-requirement-review,
 * SCEN-kibi-coarse-anchor-review, SCEN-NEG-kibi-coarse-anchor-review,
 * SCEN-kibi-coverage-depth-proof-exempt, SCEN-NEG-kibi-coverage-depth-proof-exempt,
 * SCEN-NEG-kibi-playwright-native-id.
 */
if (RUN_NODE_TEST_SUITE) {
  describe("E2E: kibi check review rules", { timeout: 600000 }, () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    const write = (relativePath: string, content: string): void => {
      const fullPath = join(sandbox.repoDir, relativePath);
      mkdirSync(join(fullPath, ".."), { recursive: true });
      writeFileSync(fullPath, content);
      stageSourceFile(sandbox, relativePath);
    };

    const requirement = (
      id: string,
      fields: Record<string, string> = {},
      links: readonly [string, string][] = [],
    ): void => {
      const extra = Object.entries(fields)
        .map(([key, value]) => `${key}: ${value}\n`)
        .join("");
      const linkLines =
        links.length === 0
          ? ""
          : `links:\n${links
              .map(
                ([type, target]) =>
                  `  - type: ${type}\n    target: ${target}\n`,
              )
              .join("")}`;
      write(
        `.kb/requirements/${id}.md`,
        `---\nid: ${id}\ntitle: Fixture requirement ${id}\nstatus: open\n${extra}${linkLines}---\n\n# ${id}\n\n## Context\n\nFixture requirement for the packed review-rule checks; it only exercises the CLI.\n`,
      );
    };

    const symbols = (
      entries: readonly {
        id: string;
        sourceFile: string;
        implements: string;
        granularity?: string;
      }[],
    ): void => {
      const lines = ["symbols:"];
      for (const entry of entries) {
        lines.push(
          `  - id: ${entry.id}`,
          `    title: ${entry.id}`,
          `    sourceFile: ${entry.sourceFile}`,
          "    status: active",
        );
        if (entry.granularity) {
          lines.push(`    granularity_reason: ${entry.granularity}`);
        }
        lines.push(
          "    relationships:",
          "      - type: implements",
          `        target: ${entry.implements}`,
        );
      }
      write(".kb/symbols.yaml", `${lines.join("\n")}\n`);
    };

    const check = async (): Promise<CheckResult> => {
      const sync = await kibi(sandbox, ["sync"]);
      assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);
      const result = await kibi(sandbox, ["check", "--format", "json"], {
        timeoutMs: 120000,
      });
      return (JSON.parse(result.stdout) as { structuredContent: CheckResult })
        .structuredContent;
    };

    const reviewed = (
      result: CheckResult,
      id: string,
    ): readonly (string | undefined)[] =>
      result.qualityDiagnostics
        .filter((diagnostic) => diagnostic.id === id)
        .map((diagnostic) => {
          assert.strictEqual(diagnostic.blocking, false, `${id} is advisory`);
          return diagnostic.entityId;
        })
        .sort();

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        if (!hasProlog) return;
        tarballs = await packAll();
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
        const init = await kibi(sandbox, ["init", "--no-hooks"]);
        assert.strictEqual(init.exitCode, 0, `${init.stdout}${init.stderr}`);
        mkdirSync(join(sandbox.repoDir, "src"), { recursive: true });
        writeFileSync(
          join(sandbox.repoDir, "src", "feature.ts"),
          "export function feature(): number {\n  return 1;\n}\n",
        );
        writeFileSync(
          join(sandbox.repoDir, "src", "settings.json"),
          '{ "feature": true }\n',
        );
        stageSourceFile(sandbox, "src/feature.ts");
        stageSourceFile(sandbox, "src/settings.json");
      },
      { timeout: 300000 },
    );

    after(
      async () => {
        if (sandbox) await sandbox.cleanup();
      },
      { timeout: 60000 },
    );

    it(
      "reports a requirement that too many symbols implement or too many current requirements depend on, and spares umbrellas and history",
      { timeout: 240000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }

        requirement("REQ-BROAD");
        requirement("REQ-UMBRELLA", { tags: "[umbrella]" });
        requirement("REQ-NARROW");
        requirement("REQ-HUB-OPEN");
        requirement("REQ-HUB-CLOSED");
        for (let i = 1; i <= 6; i += 1) {
          requirement(`REQ-OPEN-DEP-${i}`, {}, [
            ["depends_on", "REQ-HUB-OPEN"],
          ]);
          requirement(`REQ-CLOSED-DEP-${i}`, { status: "closed" }, [
            ["depends_on", "REQ-HUB-CLOSED"],
          ]);
        }
        const implementers = (target: string, count: number) =>
          Array.from({ length: count }, (_, i) => ({
            id: `SYM-${target.slice(4)}-${i + 1}`,
            sourceFile: "src/feature.ts",
            implements: target,
          }));
        symbols([
          ...implementers("REQ-BROAD", 9),
          ...implementers("REQ-UMBRELLA", 9),
          ...implementers("REQ-NARROW", 8),
        ]);

        const result = await check();
        assert.deepStrictEqual(
          reviewed(result, "broad_requirement_review"),
          ["REQ-BROAD", "REQ-HUB-OPEN"],
          `nine implementers or six current dependents are broad; eight implementers, an umbrella tag or closed dependents are not: ${JSON.stringify(result.qualityDiagnostics)}`,
        );
      },
    );

    it(
      "reports a requirement implemented only by whole-file anchors on source a declaration extractor covers, and not on files with no smaller unit",
      { timeout: 240000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }

        requirement("REQ-COARSE-SOURCE");
        requirement("REQ-COARSE-CONFIG");
        symbols([
          {
            id: "SYM-FEATURE-FILE",
            sourceFile: "src/feature.ts",
            implements: "REQ-COARSE-SOURCE",
            granularity: "module-level-behavior",
          },
          {
            id: "SYM-SETTINGS-FILE",
            sourceFile: "src/settings.json",
            implements: "REQ-COARSE-CONFIG",
            granularity: "config-artifact",
          },
        ]);

        const result = await check();
        const coarse = reviewed(result, "coarse_anchor_only_review");
        assert.ok(
          coarse.includes("REQ-COARSE-SOURCE"),
          `a whole-file anchor on TypeScript source is reviewed: ${JSON.stringify(result.qualityDiagnostics)}`,
        );
        assert.ok(
          !coarse.includes("REQ-COARSE-CONFIG"),
          "a whole-file anchor on JSON has no smaller unit, so it is not reviewed",
        );
      },
    );

    it(
      "reviews the coverage depth of a requirement with no test evidence unless it is proof-exempt with a reason",
      { timeout: 240000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }

        requirement("REQ-DEPTH-PLAIN");
        requirement("REQ-DEPTH-EXEMPT", {
          proof_exempt: "true",
          proof_exempt_reason:
            "Fixture requirement outside end-to-end proof scope.",
        });

        const result = await check();
        const depth = reviewed(result, "coverage_depth_review");
        assert.ok(
          depth.includes("REQ-DEPTH-PLAIN"),
          `a requirement with no test evidence is reviewed: ${JSON.stringify(result.qualityDiagnostics)}`,
        );
        assert.ok(
          !depth.includes("REQ-DEPTH-EXEMPT"),
          "a proof-exempt requirement with a reason is not asked for coverage depth",
        );
      },
    );

    it(
      "refuses to ingest an individually observed proof case that has no native_id",
      { timeout: 240000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }

        // A producer that reports one native case without a native_id, the
        // way the Playwright reporter did before it named each case.
        const producer = [
          "const fs = require('fs');",
          "const now = new Date().toISOString();",
          "fs.writeFileSync(process.env.KIBI_PROOF_OUTPUT, JSON.stringify({",
          "  version: 'kibi.proof-run.v1',",
          "  producer: { name: 'fixture-producer' },",
          "  integration: process.env.KIBI_PROOF_INTEGRATION,",
          "  command_argv: JSON.parse(process.env.KIBI_PROOF_COMMAND_ARGV),",
          "  code_snapshot: process.env.KIBI_PROOF_SNAPSHOT,",
          "  environment: { os: process.platform, arch: process.arch, runtime: { name: 'node', version: process.version } },",
          "  run: { outcome: 'passed', exit_code: 0, started_at: now, finished_at: now },",
          "  proof_results: [{ symbol_id: 'SYM-NATIVE-CASE', target: 'default', outcome: 'passed', binding: 'native_case',",
          "    attempts: { status: 'complete', entries: [{ outcome: 'passed', duration_ms: 1 }] } }],",
          "}));",
        ].join("\n");
        write("tests/e2e/native-producer.cjs", `${producer}\n`);
        write(
          "tests/e2e/native.test.ts",
          "export const nativeBehavior = 'v1';\n",
        );
        write(
          ".kb/proof/integrations.json",
          `${JSON.stringify(
            {
              version: "kibi.proof-integration.v1",
              integrations: [
                {
                  id: "native-fixture",
                  producer: "custom",
                  command: ["node", "tests/e2e/native-producer.cjs"],
                  targets: ["default"],
                },
              ],
            },
            null,
            2,
          )}\n`,
        );
        write(
          ".kb/tests/TEST-NATIVE-CASE.md",
          `---
id: TEST-NATIVE-CASE
title: Native case without an id
status: passing
source: tests/e2e/native.test.ts
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: native-fixture
  required_proofs:
    - symbol_id: SYM-NATIVE-CASE
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-NATIVE-CASE
    target: default
    native_id: suite::case
---

Exercises proof ingest of a native case result.
`,
        );
        const sync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);

        const prove = await kibi(sandbox, [
          "prove",
          "--test",
          "TEST-NATIVE-CASE",
        ]);
        assert.notStrictEqual(
          prove.exitCode,
          0,
          "a native case without a native_id must not prove the test",
        );
        assert.match(
          prove.stdout + prove.stderr,
          /native_case result SYM-NATIVE-CASE\/default has no native_id/,
          `ingest names the missing native_id: ${prove.stdout}${prove.stderr}`,
        );
      },
    );
  });
}
