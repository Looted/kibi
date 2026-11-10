import assert from "node:assert";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, before, beforeEach, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createMarkdownFile,
  createSandbox,
  exactBranchStorePath,
  kibi,
  packAll,
  run,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: Init-Sync-Check Workflow", () => {
    const TEST_TIMEOUT_MS = 120000;
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        if (!hasProlog) {
          console.warn("⚠️  SWI-Prolog not available, skipping workflow tests");
          return;
        }

        tarballs = await packAll();
      },
      { timeout: 120000 },
    );

    beforeEach(
      async () => {
        if (!hasProlog) return;
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
      },
      { timeout: 120000 },
    );

    afterEach(
      async () => {
        if (sandbox) {
          await sandbox.cleanup();
        }
      },
      { timeout: 120000 },
    );

    it("should init creates .kb structure", async (testContext) => {
      if (!hasProlog) {
        testContext.skip("SWI-Prolog is unavailable");
        return;
      }

      const { stdout } = await kibi(sandbox, ["init"]);

      assert.ok(stdout.includes("Kibi initialized"), "Should indicate success");

      assert.ok(existsSync(join(sandbox.repoDir, ".kb")), ".kb should exist");
      assert.ok(
        existsSync(join(sandbox.repoDir, ".kb/manifest.json")),
        "manifest.json should exist",
      );
      assert.ok(
        existsSync(exactBranchStorePath(sandbox.repoDir, "develop")),
        "exact develop branch store should exist",
      );

      const manifest = JSON.parse(
        readFileSync(join(sandbox.repoDir, ".kb/manifest.json"), "utf8"),
      );
      assert.ok(manifest.schemaVersion);
      assert.ok(!Object.hasOwn(manifest, "paths"));
    });

    it("uses a legacy .kb/config.json only to detect and plan the storage migration, and blocks on malformed JSON", async (testContext) => {
      if (!hasProlog) {
        testContext.skip("SWI-Prolog is unavailable");
        return;
      }

      mkdirSync(join(sandbox.repoDir, ".kb"), { recursive: true });
      mkdirSync(join(sandbox.repoDir, "documentation", "requirements"), {
        recursive: true,
      });
      writeFileSync(
        join(sandbox.repoDir, ".kb", "config.json"),
        JSON.stringify({
          paths: { requirements: "documentation/requirements" },
        }),
      );
      writeFileSync(
        join(sandbox.repoDir, "documentation", "requirements", "REQ-LEGACY.md"),
        "---\nid: REQ-LEGACY\ntitle: Legacy requirement\nstatus: open\n---\n\nA requirement kept under the legacy documentation layout.\n",
      );

      const init = await kibi(sandbox, ["init", "--no-hooks"]);
      assert.match(
        init.stdout + init.stderr,
        /Legacy \.kb\/config\.json found; left \.kb\/manifest\.json/,
        "init must leave a legacy workspace to kibi migrate",
      );
      assert.ok(
        !existsSync(join(sandbox.repoDir, ".kb", "manifest.json")),
        "init must not claim a legacy workspace with a fresh manifest",
      );

      const plan = await kibi(sandbox, ["migrate", "--dry-run"]);
      assert.strictEqual(plan.exitCode, 0, plan.stdout + plan.stderr);
      assert.match(
        plan.stdout + plan.stderr,
        /documentation\/requirements/,
        "the migration plan reads the configured legacy path",
      );

      writeFileSync(join(sandbox.repoDir, ".kb", "config.json"), "{ not json");
      const blocked = await kibi(sandbox, ["migrate", "--dry-run"]);
      assert.notStrictEqual(blocked.exitCode, 0);
      assert.match(
        blocked.stdout + blocked.stderr,
        /Blocked: Legacy \.kb\/config\.json is malformed[\s\S]*will not infer default legacy paths/,
        "malformed legacy JSON must block the plan instead of guessing paths",
      );
      assert.ok(
        existsSync(
          join(
            sandbox.repoDir,
            "documentation",
            "requirements",
            "REQ-LEGACY.md",
          ),
        ),
        "nothing moves while the legacy config is malformed",
      );
    });

    it(
      "runs canonical and advisory rules but not migration rules, ignores repository attempts to disable a canonical rule, and fails only on canonical findings",
      { timeout: 120000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }

        const init = await kibi(sandbox, ["init", "--no-hooks"]);
        assert.strictEqual(init.exitCode, 0, `${init.stdout}${init.stderr}`);
        createMarkdownFile(
          sandbox,
          ".kb/adr/ADR-PROPOSED.md",
          { id: "ADR-PROPOSED", title: "Proposed decision", status: "proposed" },
          "We may adopt a thing.\n\n## Context\n\nFixture decision left proposed so an advisory rule reports it and nothing blocks.",
        );
        const firstSync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(
          firstSync.exitCode,
          0,
          `${firstSync.stdout}${firstSync.stderr}`,
        );

        writeFileSync(join(sandbox.repoDir, "default-rules.json"), "{}");
        const plain = await kibi(sandbox, [
          "check",
          "--input",
          "default-rules.json",
        ]);
        const evaluated = (
          JSON.parse(plain.stdout) as {
            data?: { evaluated?: { rules?: string[] } };
          }
        ).data?.evaluated?.rules;
        assert.ok(Array.isArray(evaluated), plain.stdout);
        assert.ok(
          evaluated.includes("entity-context-missing"),
          "a plain check runs canonical rules",
        );
        assert.ok(
          evaluated.includes("adr-proposed"),
          "a plain check runs advisory rules",
        );
        for (const migrationRule of ["strict-readiness", "semantic-completeness"]) {
          assert.ok(
            !evaluated.includes(migrationRule),
            `a plain check skips the migration rule ${migrationRule}`,
          );
        }
        writeFileSync(
          join(sandbox.repoDir, "migration-rule.json"),
          JSON.stringify({ rules: ["strict-readiness"] }),
        );
        const selected = await kibi(sandbox, [
          "check",
          "--input",
          "migration-rule.json",
        ]);
        assert.deepStrictEqual(
          (
            JSON.parse(selected.stdout) as {
              data?: { evaluated?: { rules?: string[] } };
            }
          ).data?.evaluated?.rules,
          ["strict-readiness"],
          "a migration rule runs only when selected by name",
        );

        const advisoryOnly = await kibi(sandbox, ["check", "--format", "json"]);
        assert.strictEqual(
          advisoryOnly.exitCode,
          0,
          `an advisory finding alone must not fail the check: ${advisoryOnly.stdout}${advisoryOnly.stderr}`,
        );
        const advisoryResult = (
          JSON.parse(advisoryOnly.stdout) as {
            structuredContent: {
              violations: unknown[];
              qualityDiagnostics: { id: string; blocking: boolean }[];
            };
          }
        ).structuredContent;
        assert.deepStrictEqual(advisoryResult.violations, []);
        assert.ok(
          advisoryResult.qualityDiagnostics.some(
            (diagnostic) =>
              diagnostic.id === "rule.adr-proposed" && !diagnostic.blocking,
          ),
          "the advisory finding is a non-blocking quality diagnostic",
        );

        // A repository file that tries to switch the canonical context rule
        // off changes nothing: Kibi owns each rule's enforcement class.
        writeFileSync(
          join(sandbox.repoDir, ".kb", "config.json"),
          `${JSON.stringify({
            checks: {
              "entity-context-missing": false,
              rules: { "entity-context-missing": false },
            },
          })}\n`,
        );
        createMarkdownFile(
          sandbox,
          ".kb/adr/ADR-NO-CONTEXT.md",
          { id: "ADR-NO-CONTEXT", title: "Decision without context", status: "accepted" },
          "Use the thing.",
        );
        const secondSync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(
          secondSync.exitCode,
          0,
          `${secondSync.stdout}${secondSync.stderr}`,
        );
        const canonical = await kibi(sandbox, ["check", "--format", "json"]);
        assert.notStrictEqual(
          canonical.exitCode,
          0,
          "a canonical finding fails the check even when repository config tries to disable its rule",
        );
        const canonicalResult = (
          JSON.parse(canonical.stdout) as {
            structuredContent: {
              violations: { rule: string; entityId?: string }[];
              qualityDiagnostics: { id: string; blocking: boolean }[];
            };
          }
        ).structuredContent;
        assert.ok(
          canonicalResult.violations.some(
            (violation) =>
              violation.rule === "entity-context-missing" &&
              violation.entityId === "ADR-NO-CONTEXT",
          ),
          `the canonical rule still reports ADR-NO-CONTEXT: ${canonical.stdout}`,
        );
        assert.ok(
          canonicalResult.qualityDiagnostics.every(
            (diagnostic) => !diagnostic.blocking,
          ),
          "advisory findings stay non-blocking next to a canonical one",
        );
      },
    );

    it(
      "reports a coarse aggregate symbol that spans unrelated requirement tag clusters next to narrower symbols as a non-blocking quality diagnostic",
      { timeout: 120000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }

        const init = await kibi(sandbox, ["init", "--no-hooks"]);
        assert.strictEqual(init.exitCode, 0, `${init.stdout}${init.stderr}`);
        mkdirSync(join(sandbox.repoDir, "src"), { recursive: true });
        writeFileSync(
          join(sandbox.repoDir, "src", "widget.js"),
          'export class WidgetService {\n  render() {\n    return "<p>";\n  }\n  save() {\n    return true;\n  }\n}\n',
        );
        writeFileSync(
          join(sandbox.repoDir, ".kb", "symbols.yaml"),
          [
            "symbols:",
            "  - id: SYM-WIDGET-SERVICE",
            "    title: WidgetService",
            "    sourceFile: src/widget.js",
            "    status: active",
            "    relationships:",
            "      - type: implements",
            "        target: REQ-WIDGET-UI",
            "      - type: implements",
            "        target: REQ-WIDGET-STORE",
            "      - type: implements",
            "        target: REQ-WIDGET-BILL",
            "  - id: SYM-WIDGET-RENDER",
            "    title: WidgetService.render",
            "    sourceFile: src/widget.js",
            "    status: active",
            "    symbol_role: behavioral",
            "",
          ].join("\n"),
        );
        const writeRequirements = (sharedTag: string | null): void => {
          for (const [suffix, tag] of [
            ["UI", "ui"],
            ["STORE", "storage"],
            ["BILL", "billing"],
          ] as const) {
            createMarkdownFile(
              sandbox,
              `.kb/requirements/REQ-WIDGET-${suffix}.md`,
              {
                id: `REQ-WIDGET-${suffix}`,
                title: `Widget ${tag} requirement`,
                status: "open",
                tags: sharedTag ? [tag, sharedTag] : [tag],
              },
              `# Widget ${tag}\n\n## Context\n\nFixture requirement in the ${tag} cluster for the packed mixed-purpose symbol check; it only exercises the CLI.`,
            );
          }
        };
        const mixedPurpose = async () => {
          const sync = await kibi(sandbox, ["sync"]);
          assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);
          const check = await kibi(sandbox, ["check", "--format", "json"]);
          const result = (
            JSON.parse(check.stdout) as {
              structuredContent: {
                violations: { rule: string }[];
                qualityDiagnostics: {
                  id: string;
                  entityId?: string;
                  blocking: boolean;
                  evidence?: { narrowerSymbolIds?: string[] };
                }[];
              };
            }
          ).structuredContent;
          return {
            result,
            diagnostics: result.qualityDiagnostics.filter(
              (diagnostic) => diagnostic.id === "component_mixed_purpose_review",
            ),
          };
        };

        await run("git", ["add", "--", "src/widget.js", ".kb/symbols.yaml"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        writeRequirements("widget");
        const cohesive = await mixedPurpose();
        assert.deepStrictEqual(
          cohesive.diagnostics,
          [],
          "requirements that share a tag are one cluster, so nothing is reported",
        );

        writeRequirements(null);
        const unrelated = await mixedPurpose();
        assert.strictEqual(
          unrelated.diagnostics.length,
          1,
          `one mixed-purpose diagnostic for the coarse service: ${JSON.stringify(unrelated.result.qualityDiagnostics)}`,
        );
        const [diagnostic] = unrelated.diagnostics;
        assert.strictEqual(diagnostic?.entityId, "SYM-WIDGET-SERVICE");
        assert.strictEqual(diagnostic?.blocking, false);
        assert.ok(
          diagnostic?.evidence?.narrowerSymbolIds?.includes("SYM-WIDGET-RENDER"),
          "the diagnostic names the narrower same-file symbol",
        );
        assert.ok(
          !unrelated.result.violations.some((violation) =>
            violation.rule.includes("mixed-purpose"),
          ),
          "the mixed-purpose finding is never a blocking violation",
        );
      },
    );

    it("should init write no .kb/config.json, path overrides or check-disabling policy", async (testContext) => {
      if (!hasProlog) {
        testContext.skip("SWI-Prolog is unavailable");
        return;
      }

      await kibi(sandbox, ["init"]);

      assert.ok(
        !existsSync(join(sandbox.repoDir, ".kb/config.json")),
        "init must not write a user-configurable .kb/config.json",
      );
      const manifest = JSON.parse(
        readFileSync(join(sandbox.repoDir, ".kb/manifest.json"), "utf8"),
      ) as Record<string, unknown>;
      for (const key of ["paths", "checks", "rules", "disabledRules"]) {
        assert.ok(
          !Object.hasOwn(manifest, key),
          `manifest.json must not carry a ${key} override: ${JSON.stringify(manifest)}`,
        );
      }
    });

    it("should sync imports entities from documents", async (testContext) => {
      if (!hasProlog) {
        testContext.skip("SWI-Prolog is unavailable");
        return;
      }

      await kibi(sandbox, ["init"]);

      const reqDir = join(sandbox.repoDir, ".kb/requirements");
      const scenarioDir = join(sandbox.repoDir, ".kb/scenarios");
      mkdirSync(reqDir, { recursive: true });
      mkdirSync(scenarioDir, { recursive: true });

      createMarkdownFile(
        sandbox,
        ".kb/requirements/req1.md",
        {
          title: "User Login",
          type: "req",
          status: "open",
          tags: ["auth", "security"],
          owner: "alice",
        },
        "System must authenticate users via OAuth2.\n\n## Context\n\nFixture requirement for the packed init, sync and check test; it exists only to exercise the CLI and no further reason is stated.",
      );

      createMarkdownFile(
        sandbox,
        ".kb/scenarios/login.md",
        {
          title: "Login Flow",
          type: "scenario",
          status: "active",
          tags: ["auth"],
        },
        "A user clicks the login button on the sign in page and authenticates with the identity provider, then lands back in the application signed in.",
      );

      const { stdout } = await kibi(sandbox, ["sync"]);

      assert.ok(
        stdout.includes("✓ Imported"),
        `Expected sync success, got: ${stdout}`,
      );
      assert.ok(/\d+ entities/.test(stdout));

      assert.ok(
        existsSync(
          join(exactBranchStorePath(sandbox.repoDir, "develop"), "kb.rdf"),
        ),
        "RDF file should be created",
      );

      // Sync stamps the compiler contract it compiled with, so status only
      // reports compiler_changed for a store another CLI build compiled.
      const cache = JSON.parse(
        readFileSync(
          join(
            exactBranchStorePath(sandbox.repoDir, "develop"),
            "sync-cache.json",
          ),
          "utf8",
        ),
      ) as { compilerFingerprint?: unknown };
      assert.match(String(cache.compilerFingerprint), /^[0-9a-f]{64}$/);
      const status = JSON.parse(
        (await kibi(sandbox, ["status", "--format", "json"])).stdout,
      ) as { staleReasons?: { code?: string }[] };
      assert.ok(
        !(status.staleReasons ?? []).some(
          (reason) => reason.code === "compiler_changed",
        ),
        `status must not report compiler_changed after this CLI's sync: ${JSON.stringify(status.staleReasons)}`,
      );
    });

    it(
      "should query returns synced entities",
      { timeout: 20000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }

        await kibi(sandbox, ["init"]);

        createMarkdownFile(
          sandbox,
          ".kb/requirements/req-auth.md",
          {
            id: "req-auth",
            title: "Authentication Required",
            type: "req",
            status: "open",
            tags: ["security"],
          },
          "All API endpoints require authentication.\n\n## Context\n\nFixture requirement for the packed init, sync and check test; it exists only to exercise the CLI and no further reason is stated.",
        );

        await kibi(sandbox, ["sync"]);

        const { stdout } = await kibi(sandbox, ["query", "req"]);

        assert.ok(stdout.includes("Authentication Required"));
        assert.ok(stdout.includes("security"));
      },
    );

    it(
      "should refuse a document.path inside a derived .kb tree and write nothing there",
      { timeout: 60000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }

        await kibi(sandbox, ["init"]);
        const upsert = (path: string) => {
          const inputPath = join(sandbox.repoDir, "derived-target.json");
          writeFileSync(
            inputPath,
            JSON.stringify({
              type: "scenario",
              id: "SCEN-DERIVED-TARGET",
              properties: { title: "Derived target", status: "active" },
              document: {
                path,
                body: "Given a scenario aimed at a derived tree, when it is upserted, then Kibi refuses the write and leaves the tree untouched.",
              },
            }),
            "utf8",
          );
          return kibi(sandbox, ["upsert", "--input", inputPath]);
        };

        for (const derived of [
          ".kb/branches/main/SCEN-DERIVED-TARGET.md",
          ".kb/migrations/SCEN-DERIVED-TARGET.md",
        ]) {
          const refused = await upsert(derived);
          assert.notStrictEqual(refused.exitCode, 0, refused.stdout);
          assert.match(
            refused.stdout + refused.stderr,
            /SOURCE_PATH_INVALID[\s\S]*derived state/,
          );
          assert.ok(
            !existsSync(join(sandbox.repoDir, derived)),
            `${derived} must not be written`,
          );
        }

        const authored = await upsert(".kb/scenarios/SCEN-DERIVED-TARGET.md");
        assert.strictEqual(authored.exitCode, 0, authored.stderr);
        assert.ok(
          existsSync(
            join(sandbox.repoDir, ".kb/scenarios/SCEN-DERIVED-TARGET.md"),
          ),
        );
      },
    );

    it(
      "should not import a README.md inside an entity directory",
      { timeout: 20000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }

        await kibi(sandbox, ["init"]);

        createMarkdownFile(
          sandbox,
          ".kb/requirements/req-kept.md",
          {
            id: "req-kept",
            title: "Kept Requirement",
            type: "req",
            status: "open",
          },
          "A real requirement next to the directory README.\n\n## Context\n\nFixture requirement for the packed init, sync and check test; it exists only to exercise the CLI and no further reason is stated.",
        );
        createMarkdownFile(
          sandbox,
          ".kb/requirements/README.md",
          {
            id: "req-readme",
            title: "Directory Readme Posing As Requirement",
            type: "req",
            status: "open",
          },
          "This file explains the directory and must never become an entity.",
        );

        await kibi(sandbox, ["sync"]);

        const { stdout } = await kibi(sandbox, ["query", "req"]);

        assert.ok(stdout.includes("Kept Requirement"));
        assert.ok(
          !stdout.includes("Directory Readme Posing As Requirement"),
          `README.md must not be imported as an entity: ${stdout}`,
        );
      },
    );

    it(
      "should check validates KB with no violations",
      { timeout: 20000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }

        await kibi(sandbox, ["init"]);

        createMarkdownFile(
          sandbox,
          ".kb/requirements/valid-req.md",
          {
            title: "Valid Requirement",
            type: "req",
            status: "open",
            required_evidence: "asserted",
            tags: ["feature"],
            owner: "bob",
          },
          "This requirement has all required fields.\n\n## Context\n\nFixture requirement for the packed init, sync and check test; it exists only to exercise the CLI and no further reason is stated.",
        );

        await kibi(sandbox, ["sync"]);

        const { stdout, stderr, exitCode } = await kibi(sandbox, ["check"]);
        const output = stdout + stderr;

        assert.strictEqual(exitCode, 0);
        assert.ok(
          output.includes("No violations") || output.includes("KB is valid"),
          `Expected no violations, got: ${output}`,
        );
      },
    );

    it("should idempotent sync does not duplicate entities", async (testContext) => {
      if (!hasProlog) {
        testContext.skip("SWI-Prolog is unavailable");
        return;
      }

      await kibi(sandbox, ["init"]);

      createMarkdownFile(
        sandbox,
        ".kb/requirements/req1.md",
        {
          title: "Test Requirement",
          type: "req",
          status: "open",
        },
        "Content.\n\n## Context\n\nFixture requirement for the packed init, sync and check test; it exists only to exercise the CLI and no further reason is stated.",
      );

      const firstSync = await kibi(sandbox, ["sync"]);
      const firstMatch = firstSync.stdout.match(/Imported (\d+) entities/);
      const firstCount = firstMatch?.[1] ? Number.parseInt(firstMatch[1]) : 0;
      assert.ok(firstCount > 0, "First sync should import entities");

      const secondSync = await kibi(sandbox, ["sync"]);
      const secondMatch = secondSync.stdout.match(/Imported (\d+) entities/);
      const secondCount = secondMatch?.[1]
        ? Number.parseInt(secondMatch[1])
        : 0;

      assert.strictEqual(
        secondCount,
        0,
        "Second sync should report 0 new imports (cache hit)",
      );
    });

    it(
      "should query with ID filter returns specific entity",
      { timeout: 20000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }

        await kibi(sandbox, ["init"]);

        createMarkdownFile(
          sandbox,
          ".kb/requirements/req-auth.md",
          {
            id: "req-auth",
            title: "Auth Requirement",
            type: "req",
            status: "open",
            tags: ["auth", "security"],
          },
          "# Auth\n\n## Context\n\nFixture requirement for the packed init, sync and check test; it exists only to exercise the CLI and no further reason is stated.",
        );

        createMarkdownFile(
          sandbox,
          ".kb/requirements/req-perf.md",
          {
            id: "req-perf",
            title: "Performance Requirement",
            type: "req",
            status: "open",
            tags: ["performance"],
          },
          "# Performance\n\n## Context\n\nFixture requirement for the packed init, sync and check test; it exists only to exercise the CLI and no further reason is stated.",
        );

        await kibi(sandbox, ["sync"]);

        const { stdout } = await kibi(sandbox, [
          "query",
          "req",
          "--id",
          "req-auth",
        ]);

        assert.ok(stdout.includes("Auth Requirement"));
        assert.ok(!stdout.includes("Performance Requirement"));
      },
    );

    it(
      "should query by source file return only entities whose source matches that path",
      { timeout: 20000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }

        await kibi(sandbox, ["init"]);

        createMarkdownFile(
          sandbox,
          ".kb/requirements/req-billing.md",
          {
            id: "req-billing",
            title: "Billing Requirement",
            type: "req",
            status: "open",
          },
          "# Billing\n\n## Context\n\nFixture requirement for the packed init, sync and check test; it exists only to exercise the CLI and no further reason is stated.",
        );

        createMarkdownFile(
          sandbox,
          ".kb/requirements/req-audit.md",
          {
            id: "req-audit",
            title: "Audit Requirement",
            type: "req",
            status: "open",
          },
          "# Audit\n\n## Context\n\nFixture requirement for the packed init, sync and check test; it exists only to exercise the CLI and no further reason is stated.",
        );

        const sync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);

        const result = await kibi(sandbox, [
          "query",
          "req",
          "--source",
          ".kb/requirements/req-billing.md",
          "--format",
          "json",
        ]);
        assert.strictEqual(result.exitCode, 0, result.stderr);
        const rows = JSON.parse(result.stdout) as Array<{
          id: string;
          source?: string;
        }>;
        assert.deepStrictEqual(
          rows.map((row) => row.id),
          ["req-billing"],
          `only the entity from the queried source file may be returned: ${result.stdout}`,
        );
        assert.strictEqual(rows[0]?.source, ".kb/requirements/req-billing.md");
        assert.ok(
          !result.stdout.includes("req-audit"),
          "an entity whose source does not match the path must be excluded",
        );
      },
    );

    it(
      "should reject a query for an unknown entity type and name the valid types",
      { timeout: 20000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }

        await kibi(sandbox, ["init"]);
        await kibi(sandbox, ["sync"]);

        const result = await kibi(sandbox, ["query", "requirement-typo"]);

        assert.notStrictEqual(
          result.exitCode,
          0,
          "an unknown entity type must not be answered as an empty result",
        );
        assert.ok(
          result.stderr.includes("Invalid type 'requirement-typo'"),
          `the error must name the rejected type: ${result.stderr}`,
        );
        assert.ok(
          result.stderr.includes("Valid types:") &&
            result.stderr.includes("req"),
          `the error must list the valid types: ${result.stderr}`,
        );
        assert.ok(!result.stdout.includes("[]"));
      },
    );

    it("should handle empty repository gracefully", async (testContext) => {
      if (!hasProlog) {
        testContext.skip("SWI-Prolog is unavailable");
        return;
      }

      await kibi(sandbox, ["init"]);

      const syncResult = await kibi(sandbox, ["sync"]);
      assert.ok(
        syncResult.stdout.includes("Imported 0 entities") ||
          syncResult.stdout.includes("0 entities"),
      );

      const { stdout } = await kibi(sandbox, ["query", "req"]);
      assert.ok(stdout.includes("[]") || stdout.includes("No entities"));
    });
  });
}
