import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const integrations = JSON.parse(
  readFileSync(join(ROOT, ".kb", "proof", "integrations.json"), "utf8"),
) as {
  version: string;
  integrations: Array<{
    id: string;
    producer: string;
    command: string[];
    artifact?: string;
    producer_version?: string;
    targets?: string[];
  }>;
};
const steps = JSON.parse(
  readFileSync(join(ROOT, "proof", "steps.json"), "utf8"),
) as Array<{ test_id: string; steps: string[][] }>;
const baseline = JSON.parse(
  readFileSync(join(ROOT, "proof", "baseline.json"), "utf8"),
) as {
  mode: string;
  currentRequirements: number;
  proofProven: number;
  currentUnproven: number;
  trackedGaps: Record<string, number>;
};
const proofWorkflow = readFileSync(
  join(ROOT, ".github", "workflows", "proof.yml"),
  "utf8",
);
const ciWorkflow = readFileSync(
  join(ROOT, ".github", "workflows", "ci.yml"),
  "utf8",
);
const proofPackedRunner = readFileSync(
  join(ROOT, "scripts", "run-proof-packed-e2e.mjs"),
  "utf8",
);

describe("strict proof workflow contract", () => {
  test("integrations execute through kibi prove with declarative steps", () => {
    expect(integrations.version).toBe("kibi.proof-integration.v1");
    expect(integrations.integrations.length).toBeGreaterThan(0);
    const ids = new Set<string>();
    for (const integration of integrations.integrations) {
      expect(ids.has(integration.id)).toBe(false);
      ids.add(integration.id);
      expect(integration.command.length).toBeGreaterThan(0);
      expect(integration.command[0]).not.toBe("sh");
      expect(integration.command[0]).not.toBe("bash");
    }

    const selfProof = integrations.integrations.find(
      (integration) => integration.id === "self-proof",
    );
    expect(selfProof).toMatchObject({
      id: "self-proof",
      producer: "command",
      command: ["node", "scripts/run-proof-producer.mjs"],
      artifact: ".kb/proof/runs/self-proof.json",
      targets: ["default"],
    });

    const zcodeNative = integrations.integrations.find(
      (integration) => integration.id === "zcode-native",
    );
    expect(zcodeNative).toMatchObject({
      id: "zcode-native",
      producer: "zcode-native",
      producer_version: "1.0.0",
      command: ["node", "scripts/run-zcode-proof.mjs"],
      artifact: ".kb/proof/runs/zcode-native.json",
      targets: ["default"],
    });
    expect(zcodeNative?.producer).not.toBe("command");

    const zcodeSteps = steps.find(
      (entry) => entry.test_id === "TEST-zcode-kibi-plugin-v1",
    )?.steps;
    expect(zcodeSteps).toContainEqual(["node", "scripts/run-zcode-proof.mjs"]);

    const verificationEvidenceSteps = steps.find(
      (entry) => entry.test_id === "TEST-kibi-verification-evidence-contract",
    )?.steps;
    expect(verificationEvidenceSteps).toContainEqual([
      "bun",
      "test",
      "--timeout",
      "120000",
      "./packages/cli/tests/proof/receipt-binding.test.ts",
      "./packages/cli/tests/extractors/manifest.test.ts",
    ]);

    expect(steps.length).toBeGreaterThan(0);
    for (const entry of steps) {
      expect(
        existsSync(join(ROOT, ".kb", "tests", `${entry.test_id}.md`)),
      ).toBe(true);
      expect(entry.steps.length).toBeGreaterThan(0);
      for (const step of entry.steps) {
        expect(step.length).toBeGreaterThan(0);
        expect(step[0]).not.toBe("sh");
        expect(step[0]).not.toBe("bash");
        if (step[0] === "bun" && step[1] === "test") {
          for (const argument of step.slice(2)) {
            if (
              argument.includes("/") &&
              /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(argument)
            ) {
              expect(argument.startsWith("./")).toBe(true);
            }
          }
        }
      }

      const markdown = readFileSync(
        join(ROOT, ".kb", "tests", `${entry.test_id}.md`),
        "utf8",
      );
      const frontmatter = markdown.match(/^---\n([\s\S]*?)\n---/)?.[1];
      expect(frontmatter).toBeTruthy();
      const parsed = Bun.YAML.parse(frontmatter ?? "") as {
        proof_contract?: {
          integration?: string;
          required_proofs?: Array<{ symbol_id?: string; target?: string }>;
          success_policy?: string;
        };
      };
      expect(["self-proof", "zcode-native"]).toContain(
        parsed.proof_contract?.integration ?? "",
      );
      expect(parsed.proof_contract?.success_policy).toBe(
        "all_required_first_attempt",
      );
      expect(parsed.proof_contract?.required_proofs?.length).toBeGreaterThan(0);
      for (const obligation of parsed.proof_contract?.required_proofs ?? []) {
        expect(obligation.symbol_id).toMatch(/^SYM-/);
        expect(obligation.target).toBe("default");
      }
    }
  });

  test("no old verification architecture remains in the workflow", () => {
    expect(existsSync(join(ROOT, "proof", "verification-registry.json"))).toBe(
      false,
    );
    expect(existsSync(join(ROOT, "scripts", "run-proof-contract.mjs"))).toBe(
      false,
    );
    expect(existsSync(join(ROOT, "scripts", "run-proof-runner.mjs"))).toBe(
      false,
    );
    expect(proofWorkflow).not.toContain("run-proof-contract.mjs");
    expect(proofWorkflow).not.toContain("kibi verify");
    expect(proofWorkflow).toContain("kibi prove --all");
  });

  test("proof runs before baseline enforcement and report generation", () => {
    const runner = proofWorkflow.indexOf(
      "Prove every contracted test through Kibi",
    );
    const baselineCheck = proofWorkflow.indexOf(
      "Enforce proof baseline and clean snapshot",
    );
    const report = proofWorkflow.indexOf("Generate requirement health report");
    expect(runner).toBeGreaterThanOrEqual(0);
    expect(baselineCheck).toBeGreaterThan(runner);
    expect(report).toBeGreaterThan(baselineCheck);
    expect(proofWorkflow).toContain(
      "--rules no-dangling-refs,source-relationship-parity,no-cycles,required-fields,deprecated-adr-no-successor,domain-contradictions,query-plan-safety,logic-coverage,strict-fact-shape,strict-req-fact-pairing,predicate-verifiability,rule-safety,rule-verifiability,semantic-completeness",
    );
    expect(ciWorkflow).not.toContain("Generate Kibi requirement health report");
  });

  test("packed proof steps isolate compilation and cleanup", () => {
    const packedSteps = steps.flatMap((entry) =>
      entry.steps.filter(
        (step) => step[1] === "scripts/run-proof-packed-e2e.mjs",
      ),
    );
    expect(packedSteps.length).toBeGreaterThan(0);
    for (const step of packedSteps) {
      expect(step).toHaveLength(3);
      expect(step[0]).toBe("node");
      expect(step[2]).toMatch(
        /^documentation\/tests\/e2e\/packed\/[^/]+\.test\.ts$/,
      );
      expect(step.join(" ")).not.toContain("/tmp/kibi-e2e-packed-compiled");
    }
    expect(proofPackedRunner).toContain("mkdtemp(");
    expect(proofPackedRunner).toContain("run-packed-e2e.mjs");
    expect(proofPackedRunner).toContain("KIBI_PROOF_PACKED");
    expect(proofPackedRunner).toContain(
      "rm(compiledDirectory, { recursive: true, force: true })",
    );
  });

  test("ratchet baseline records the stricter per-scenario proof gaps", () => {
    expect(baseline.mode).toBe("ratchet");
    expect(baseline.currentRequirements).toBe(104);
    expect(baseline.proofProven).toBe(66);
    expect(baseline.currentUnproven).toBe(38);
    expect(baseline.trackedGaps).toEqual({
      missing_passing_e2e: 21,
      missing_production_symbol_coverage: 26,
      missing_proof_receipt: 12,
      unresolved_semantic_proposition: 2,
      missing_production_symbol: 2,
    });
  });
});
