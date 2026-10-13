import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { load as loadYaml } from "js-yaml";
import { discoverSourceFiles } from "../../../src/commands/sync/discovery.js";
import { extractFromMarkdown } from "../../../src/extractors/markdown.js";
import {
  applyInventoryRederivation,
  applyInventoryRederivationDroppingGrounding,
  applySafeInventoryRederivations,
  planInventoryRederivation,
} from "../../../src/operations/migration/inventory-rederive.js";
import { writePendingSourceReceipt } from "../../../src/operations/mutation/source-authoring.js";
import { analyzeSemanticAdvisorInput } from "../../../src/operations/semantic-advisor/analyze-prose.js";
import { validateSemanticInventoryBoundary } from "../../../src/operations/semantic-advisor/ingestion-boundary.js";
import {
  writeCurrentRequirement,
  writeDriftedRequirement,
} from "../../helpers/schema6-fixture.js";

function boundaryErrors(root: string, id: string): string[] {
  const result = extractFromMarkdown(
    path.join(root, ".kb", "requirements", `${id}.md`),
  );
  const payload = {
    type: "req",
    id,
    properties: result.entity as unknown as Record<string, unknown>,
    relationships: result.relationships,
  };
  return [
    ...validateSemanticInventoryBoundary(
      payload,
      result.relationships,
      analyzeSemanticAdvisorInput({ payload }).receipt,
    ).errors,
  ];
}

describe("semantic inventory re-derivation", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "kibi-rederive-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("reports every drifted requirement and only those", () => {
    writeDriftedRequirement(root, "REQ-upload-resume", 0);
    writeDriftedRequirement(root, "REQ-upload-unsafe", 1);
    writeCurrentRequirement(root, "REQ-upload-current", "Uploads must log.");

    const plans = planInventoryRederivation(root);

    expect(plans.map((plan) => plan.requirementId)).toEqual([
      "REQ-upload-resume",
      "REQ-upload-unsafe",
    ]);
    for (const plan of plans) {
      expect(plan.errors.join("; ")).toContain(
        "does not match advisor proposition",
      );
    }
  });

  test("keeps matching claims modeled and makes reclassified claims unresolved", () => {
    const { propositions } = writeDriftedRequirement(
      root,
      "REQ-upload-resume",
      0,
    );
    const [plan] = planInventoryRederivation(root);

    expect(plan?.safe).toBe(true);
    expect(plan?.summary).toEqual({
      keptModeled: 1,
      roleChanges: 2,
      newlyUnresolved: 1,
      droppedClaims: 0,
      downgradedModeled: 0,
    });
    const byKey = new Map(
      plan?.contract.semantic_inventory.map((entry) => [
        entry.claim_key,
        entry,
      ]),
    );
    // Claim 0: descriptive -> normative, its grounding keeps it modeled.
    expect(byKey.get(propositions[0]?.claim_key ?? "")).toMatchObject({
      role: "normative",
      status: "modeled",
    });
    // Claim 1: rationale -> normative; never silently modeled.
    const reclassified = byKey.get(propositions[1]?.claim_key ?? "");
    expect(reclassified?.role).toBe("normative");
    expect(["ambiguous", "ontology_gap", "missing"]).toContain(
      reclassified?.status ?? "",
    );
    expect(plan?.contract.logic_claims).toContain(
      propositions[1]?.claim_key ?? "",
    );
  });

  test("applying a safe re-derivation makes the requirement pass ingestion and changes only contract fields", () => {
    writeDriftedRequirement(root, "REQ-upload-resume", 0);
    const file = path.join(root, ".kb/requirements/REQ-upload-resume.md");
    const before = readFileSync(file, "utf8");
    expect(boundaryErrors(root, "REQ-upload-resume").length).toBeGreaterThan(0);

    const outcome = applyInventoryRederivation(root, "REQ-upload-resume");

    expect(outcome.outcome).toBe("rederived");
    expect(boundaryErrors(root, "REQ-upload-resume")).toEqual([]);
    const after = readFileSync(file, "utf8");
    const body = (content: string) => content.slice(content.lastIndexOf("---"));
    expect(body(after)).toBe(body(before));
    const frontmatter = (content: string) =>
      loadYaml(content.split("---")[1] ?? "") as Record<string, unknown>;
    const contractKeys = ["semantic_inventory", "logic_claims"];
    const strip = (data: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(data).filter(([key]) => !contractKeys.includes(key)),
      );
    expect(strip(frontmatter(after))).toEqual(strip(frontmatter(before)));
  });

  test("rebinds the pending-source receipt of a rewritten untracked requirement", () => {
    writeDriftedRequirement(root, "REQ-upload-resume", 0);
    const relative = ".kb/requirements/REQ-upload-resume.md";
    const file = path.join(root, relative);
    const before = readFileSync(file);
    writePendingSourceReceipt(
      root,
      relative,
      createHash("sha256").update(before).digest("hex"),
    );
    const receiptPath = path.join(
      root,
      ".kb/recovery/pending-sources",
      `${createHash("sha256").update(relative).digest("hex")}.json`,
    );

    expect(applyInventoryRederivation(root, "REQ-upload-resume").outcome).toBe(
      "rederived",
    );

    const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
      path: string;
      afterHash: string;
    };
    expect(receipt.path).toBe(relative);
    expect(receipt.afterHash).toBe(
      createHash("sha256").update(readFileSync(file)).digest("hex"),
    );
    expect(receipt.afterHash).not.toBe(
      createHash("sha256").update(before).digest("hex"),
    );
  });

  test("a re-derived untracked requirement passes sync source discovery (round-2 evidence replay)", async () => {
    // Replays the eval checkout: .kb/ restored from a tarball, never tracked,
    // every file bound by a kb_upsert receipt, then a migrate re-derivation.
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: root });
    writeDriftedRequirement(root, "REQ-upload-resume", 0);
    const relative = ".kb/requirements/REQ-upload-resume.md";
    writePendingSourceReceipt(
      root,
      relative,
      createHash("sha256")
        .update(readFileSync(path.join(root, relative)))
        .digest("hex"),
    );

    expect(applySafeInventoryRederivations(root).rederived).toHaveLength(1);

    const discovered = await discoverSourceFiles(root, { trackedOnly: true });
    expect(discovered.markdownFiles).toContain(path.join(root, relative));
  });

  test("writes no receipt for a rewritten requirement that had none", () => {
    writeDriftedRequirement(root, "REQ-upload-resume", 0);
    applyInventoryRederivation(root, "REQ-upload-resume");
    expect(existsSync(path.join(root, ".kb/recovery/pending-sources"))).toBe(
      false,
    );
  });

  test("is idempotent: a second run finds nothing to re-derive", () => {
    writeDriftedRequirement(root, "REQ-upload-resume", 0);
    applySafeInventoryRederivations(root);
    const file = path.join(root, ".kb/requirements/REQ-upload-resume.md");
    const once = readFileSync(file, "utf8");

    expect(planInventoryRederivation(root)).toEqual([]);
    expect(applyInventoryRederivation(root, "REQ-upload-resume").outcome).toBe(
      "unchanged",
    );
    expect(readFileSync(file, "utf8")).toBe(once);
  });

  test("leaves a requirement whose grounding no longer matches a modeled claim for a manual fix", () => {
    const { propositions } = writeDriftedRequirement(
      root,
      "REQ-upload-unsafe",
      1,
    );
    const file = path.join(root, ".kb/requirements/REQ-upload-unsafe.md");
    const before = readFileSync(file, "utf8");

    const [plan] = planInventoryRederivation(root);
    expect(plan?.safe).toBe(false);
    expect(plan?.reasons.join("; ")).toContain(
      `grounded claim ${propositions[1]?.claim_key} is not a modeled claim`,
    );

    const result = applySafeInventoryRederivations(root);
    expect(result.rederived).toEqual([]);
    expect(result.manual.map((entry) => entry.requirementId)).toEqual([
      "REQ-upload-unsafe",
    ]);
    expect(readFileSync(file, "utf8")).toBe(before);
    expect(() => applyInventoryRederivation(root, "REQ-upload-unsafe")).toThrow(
      "cannot be re-derived automatically",
    );
  });

  test("refuses to apply when the requirement changed after planning", () => {
    writeDriftedRequirement(root, "REQ-upload-resume", 0);
    const [plan] = planInventoryRederivation(root);
    const file = path.join(root, ".kb/requirements/REQ-upload-resume.md");
    writeFileSync(
      file,
      readFileSync(file, "utf8").replace(
        "title: REQ-upload-resume",
        "title: REQ-upload-resume\nowner: someone-else",
      ),
      "utf8",
    );
    // A frontmatter edit outside the contract keeps the same plan.
    expect(planInventoryRederivation(root)[0]?.contractHash).toBe(
      plan?.contractHash ?? "",
    );
    expect(() =>
      applyInventoryRederivation(root, "REQ-upload-resume", "0".repeat(64)),
    ).toThrow("changed since planning");
  });

  test("an approved unsafe re-derivation drops exactly the orphaned grounding links and passes ingestion", () => {
    const { propositions, factId } = writeDriftedRequirement(
      root,
      "REQ-upload-unsafe",
      1,
    );
    const file = path.join(root, ".kb/requirements/REQ-upload-unsafe.md");
    const before = readFileSync(file, "utf8");
    const [plan] = planInventoryRederivation(root);
    expect(plan?.safe).toBe(false);
    expect(plan?.rederivableByDroppingGrounding).toBe(true);
    expect(plan?.orphanedGrounding).toEqual([
      {
        type: "requires_predicate",
        target: factId,
        claimKey: propositions[1]?.claim_key ?? "",
        inFrontMatter: true,
      },
    ]);

    // A drop list that differs from the plan is refused before any write.
    expect(() =>
      applyInventoryRederivationDroppingGrounding(
        root,
        "REQ-upload-unsafe",
        plan?.contractHash ?? "",
        [{ type: "requires_predicate", target: "FACT-other" }],
      ),
    ).toThrow("changed since planning");
    expect(readFileSync(file, "utf8")).toBe(before);

    const outcome = applyInventoryRederivationDroppingGrounding(
      root,
      "REQ-upload-unsafe",
      plan?.contractHash ?? "",
      [{ type: "requires_predicate", target: factId }],
    );
    expect(outcome.outcome).toBe("rederived");
    expect(boundaryErrors(root, "REQ-upload-unsafe")).toEqual([]);
    expect(planInventoryRederivation(root)).toEqual([]);
    const strip = (data: Record<string, unknown>) => {
      const {
        semantic_inventory: _inventory,
        logic_claims: _claims,
        semantic_source_hash: _hash,
        links: _links,
        ...rest
      } = data;
      return rest;
    };
    const frontmatterOf = (content: string) =>
      loadYaml(content.split("---")[1] ?? "") as Record<string, unknown>;
    expect(frontmatterOf(readFileSync(file, "utf8")).links).toBeUndefined();
    expect(strip(frontmatterOf(readFileSync(file, "utf8")))).toEqual(
      strip(frontmatterOf(before)),
    );
    // The grounding fact itself stays.
    expect(existsSync(path.join(root, ".kb", "facts", `${factId}.md`))).toBe(
      true,
    );
  });
});
