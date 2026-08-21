import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import {
  type Tarballs,
  type TestSandbox,
  createSandbox,
  packAll,
} from "./helpers.js";
import { runStdinRoute } from "./mcp-cli-operation-parity-support.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";
const RELEVANCE_CASE_SYMBOL_ID = "SYM-kibi-predicate-suggestion-relevance-e2e";
const LAUNCHER_ONTOLOGY_CASE_SYMBOL_ID =
  "SYM-kibi-consumer-local-plugin-launcher-ontology-e2e";

type PredicateCandidate = {
  readonly predicate_name: string;
  readonly predicate_args: readonly string[];
  readonly eligibility: "eligible" | "rejected";
  readonly binding_status: "complete" | "incomplete";
  readonly rejection_reasons: readonly string[];
};

type SuggestionResult = {
  readonly candidates: readonly PredicateCandidate[];
  readonly recommendedAction: string;
  readonly recommendedPredicateSchema: Readonly<Record<string, unknown>> | null;
  readonly applyPlan: readonly {
    readonly properties?: Readonly<Record<string, unknown>>;
  }[];
  readonly warnings: readonly string[];
};

async function suggest(
  sandbox: TestSandbox,
  input: Readonly<Record<string, unknown>>,
): Promise<SuggestionResult> {
  const result = await runStdinRoute(sandbox, "suggest-predicates", {
    ...input,
    includeExistingSchemas: false,
  });
  assert.equal(
    result.exitCode,
    0,
    `packed suggest-predicates failed: ${result.stdout}${result.stderr}`,
  );
  const parsed = JSON.parse(result.stdout) as {
    readonly data?: SuggestionResult;
  } & SuggestionResult;
  return parsed.data ?? parsed;
}

// executable_for TEST-kibi-predicate-suggestion-relevance-v1
export async function assertPackedPredicateSuggestionRelevance(
  sandbox: TestSandbox,
): Promise<void> {
  const unrelated = await suggest(sandbox, {
    text: "A consumer-local MCP launcher must resolve dependencies without downloading packages or falling back to global installations.",
    schemaId: "FACT-SCHEMA-EVENT-PUBLISH",
    argumentBindings: {
      subject: "consumer_launcher",
      event: "LauncherDependenciesResolved",
    },
    maxCandidates: 1,
  });
  assert.equal(unrelated.candidates[0]?.predicate_name, "publishes_event");
  assert.equal(unrelated.candidates[0]?.eligibility, "rejected");
  assert.equal(unrelated.candidates[0]?.binding_status, "complete");
  assert.ok((unrelated.candidates[0]?.rejection_reasons.length ?? 0) > 0);
  assert.equal(
    unrelated.candidates.some(
      (candidate) => candidate.eligibility === "eligible",
    ),
    false,
  );
  assert.equal(unrelated.recommendedAction, "record_ontology_gap");
  assert.equal(unrelated.applyPlan[0]?.properties?.fact_kind, "observation");

  const descriptive = await suggest(sandbox, {
    text: "The launcher uses cwd.",
    maxCandidates: 10,
  });
  assert.deepEqual(descriptive.candidates, []);
  assert.equal(descriptive.recommendedAction, "record_ontology_gap");

  const gapInput = {
    text: "The launcher must preserve an unrecognized handoff contract for future hosts.",
    minScore: 0.8,
  } as const;
  const firstGap = await suggest(sandbox, gapInput);
  const secondGap = await suggest(sandbox, gapInput);
  assert.equal(firstGap.recommendedAction, "record_ontology_gap");
  assert.ok(firstGap.recommendedPredicateSchema);
  assert.deepEqual(
    firstGap.recommendedPredicateSchema,
    secondGap.recommendedPredicateSchema,
  );

  const compound = await suggest(sandbox, {
    text: "Unresolved placeholders are invalid and ambiguous multiple usable roots fail clearly.",
    maxCandidates: 8,
  });
  assert.deepEqual(compound.candidates, []);
  assert.equal(compound.recommendedAction, "record_ontology_gap");
  assert.equal(compound.recommendedPredicateSchema, null);
  assert.deepEqual(compound.applyPlan, []);
  assert.match(
    compound.warnings[0] ?? "",
    /requires one atomic assertive proposition; semantic advisor detected 2/,
  );
}

// executable_for TEST-kibi-consumer-local-plugin-launcher-ontology-v1
export async function assertPackedConsumerLocalPluginLauncherOntology(
  sandbox: TestSandbox,
): Promise<void> {
  const launcherClauses = [
    {
      text: "The published kibi-cursor plugin must resolve and execute the consumer project's project-local kibi-mcp package without downloading packages or using a global or plugin-local runtime",
      predicateName: "dependency_resolution_policy",
      predicateArgs: [
        "the_published_kibi_cursor_plugin",
        "consumer_projects_project-local_kibi-mcp_package",
        "consumer_local",
        "no_download",
      ],
      launcherSchema: true,
    },
    {
      text: "It must resolve the consumer workspace in deterministic order: explicit workspace argument, WORKSPACE_FOLDER_PATHS, KIBI_WORKSPACE, CURSOR_WORKSPACE, then cwd only when cwd demonstrably contains project-local kibi-mcp",
      predicateName: "ordered_resolution_strategy",
      predicateArgs: [
        "launcher",
        "explicit_workspace_argument__WORKSPACE_FOLDER_PATHS__KIBI_WORKSPACE__CURSOR_WORKSPACE",
        "cwd_demonstrably_contains_project-local_kibi-mcp",
      ],
      launcherSchema: true,
    },
    {
      text: "unresolved placeholders are invalid",
      predicateName: "resolution_failure_policy",
      predicateArgs: ["launcher", "unresolved_placeholders", "reject_input"],
      launcherSchema: true,
    },
    {
      text: "ambiguous multiple usable roots fail clearly",
      predicateName: "resolution_failure_policy",
      predicateArgs: [
        "launcher",
        "ambiguous_multiple_usable_roots",
        "clear_error",
      ],
      launcherSchema: true,
    },
    {
      text: "The launcher must resolve kibi-mcp through consumer-scoped Node package semantics including exports-restricted and pnpm-style layouts, and reject packages outside consumer scope unless active package-manager semantics authorize it",
      predicateName: "exception_rule",
      predicateArgs: [
        "launcher",
        "consumer_scoped_node_package_semantics",
        "active_package_manager_semantics",
      ],
      launcherSchema: false,
    },
    {
      text: "It must spawn the declared kibi-mcp bin with cwd and KIBI_WORKSPACE set to the consumer workspace, preserve stdio, and propagate child exit codes and termination signals",
      predicateName: "process_delegation_contract",
      predicateArgs: [
        "launcher",
        "resolved_executable",
        "consumer_cwd",
        "consumer_workspace_environment",
        "inherited_stdio",
        "propagate_exit_and_termination",
      ],
      launcherSchema: true,
    },
    {
      text: "Missing project-local kibi-mcp must produce a concise actionable error",
      predicateName: "failure_behavior",
      predicateArgs: ["launcher", "missing_dependency", "actionable_error"],
      launcherSchema: true,
    },
  ] as const;
  const unrelatedPredicateNames = new Set([
    "publishes_event",
    "has_unsaved_changes",
    "scoped_authorization_rule",
  ]);
  const coveredLauncherSchemas = new Set<string>();

  for (const {
    text,
    predicateName,
    predicateArgs,
    launcherSchema,
  } of launcherClauses) {
    const result = await suggest(sandbox, { text, maxCandidates: 8 });
    const eligible = result.candidates.filter(
      (candidate) => candidate.eligibility === "eligible",
    );
    const expected = eligible.find(
      (candidate) => candidate.predicate_name === predicateName,
    );
    assert.ok(
      expected,
      `${LAUNCHER_ONTOLOGY_CASE_SYMBOL_ID}: ${predicateName} was not eligible`,
    );
    assert.deepEqual(expected.predicate_args, predicateArgs);
    if (launcherSchema) coveredLauncherSchemas.add(predicateName);
    assert.deepEqual(
      eligible
        .filter(
          (candidate) =>
            unrelatedPredicateNames.has(candidate.predicate_name) ||
            /annotation/i.test(candidate.predicate_name),
        )
        .map((candidate) => candidate.predicate_name),
      [],
      `${LAUNCHER_ONTOLOGY_CASE_SYMBOL_ID}: unrelated launcher candidates became eligible`,
    );
  }
  assert.deepEqual([...coveredLauncherSchemas].sort(), [
    "dependency_resolution_policy",
    "failure_behavior",
    "ordered_resolution_strategy",
    "process_delegation_contract",
    "resolution_failure_policy",
  ]);
}

if (RUN_NODE_TEST_SUITE) {
  describe(
    "packed CLI predicate suggestion relevance",
    { concurrency: false },
    () => {
      let tarballs: Tarballs;
      let sandbox: TestSandbox;

      before(
        async () => {
          tarballs = await packAll();
          sandbox = createSandbox();
          await sandbox.install(tarballs);
          await sandbox.initGitRepo();
        },
        { timeout: 300_000 },
      );

      after(async () => {
        if (sandbox) await sandbox.cleanup();
      });

      it(RELEVANCE_CASE_SYMBOL_ID, { timeout: 120_000 }, async () =>
        assertPackedPredicateSuggestionRelevance(sandbox),
      );
      it(LAUNCHER_ONTOLOGY_CASE_SYMBOL_ID, { timeout: 120_000 }, async () =>
        assertPackedConsumerLocalPluginLauncherOntology(sandbox),
      );
    },
  );
}
