// implements REQ-014
import { afterEach, describe, expect, test } from "bun:test";
import { skipBlankLines } from "../src/commands/github-init.js";
import { relationshipFailureMessage } from "../src/commands/sync/persistence.js";
import { skipNonIntegerFactNumber } from "../src/traceability/temp-kb.js";
import { missingManifestActivation } from "../src/operations/bootstrap/activation.js";
import { writeOptionalStderr } from "../src/cli-json-command.js";
import { passingE2eStage } from "../src/public/impact/full-kb-quality.js";
import { filterSourceOnlySignals } from "../src/operations/bootstrap/generate.js";
import { stringLogicClaims } from "../src/operations/semantic-advisor/analyze-prose.js";
import { finishedAtPrecedesStartedAt } from "../src/public/proof-receipt.js";
import { isBehaviorSourceEdit } from "../src/traceability/staged-impact-contract.js";
import { exitCodeFromCliFailure } from "../src/cli.js";
import { optionalPredicateName } from "../src/operations/modeling/predicate-loader.js";
import { predicateSchemaFromEntity } from "../src/operations/modeling/predicate-loader.js";
import { wrongKindRelationshipError } from "../src/operations/mutation/relationships.js";
import { restoreOrUnlinkCoordinateArtifact } from "../src/operations/mutation/symbol-refresh.js";
import {
  PrologProcess,
  bindProcessExitHandler,
  registerProcessExitOnce,
} from "../src/prolog.js";
import { attachmentFailureMessage } from "../src/runtime/cli-runtime.js";
import { unreadableMigrationJournalError } from "../src/utils/branch-resolver.js";
import { failedEffectStatus } from "../src/public/operations/result-envelope.js";
import { requireKnownSpec } from "../src/public/operations/catalog.js";
import { requireCliOperationMetadata } from "../src/cli-operation-metadata.js";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

afterEach(() => {
  process.exitCode = 0;
});

describe("cli remasure11 leftover helpers", () => {
  test("covers extracted leftover helpers", () => {
    expect(skipBlankLines(["a", "", "", "b"], 1)).toBe(3);
    expect(skipBlankLines(["a", "b"], 2)).toBe(2);
    expect(relationshipFailureMessage(undefined, undefined)).toBe(
      "Unknown error",
    );
    expect(relationshipFailureMessage("single", "batch")).toBe("single");
    expect(relationshipFailureMessage(undefined, "batch")).toBe("batch");
    expect(skipNonIntegerFactNumber("value_int", 1.5)).toBe(true);
    expect(skipNonIntegerFactNumber("value_int", 2)).toBe(false);
    expect(skipNonIntegerFactNumber("value_number", 1.5)).toBe(false);
    expect(
      isBehaviorSourceEdit({
        path: "src/app.ts",
        intersectsBehaviorBearingSymbol: true,
        knownUserFacingSurface: false,
        diffText: "",
      }),
    ).toBe(false);
    expect(missingManifestActivation(true, false).activationState).toBe(
      "vendored_only",
    );
    expect(missingManifestActivation(false, true).activationState).toBe(
      "root_uninitialized",
    );
    expect(passingE2eStage({ ok: true })).toEqual({ ok: true });
    expect(passingE2eStage(["nope"])).toBeUndefined();
    const writes: string[] = [];
    const write = process.stderr.write;
    process.stderr.write = ((chunk: unknown) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
    try {
      writeOptionalStderr(undefined);
      writeOptionalStderr("err\n");
    } finally {
      process.stderr.write = write;
    }
    expect(writes).toEqual(["err\n"]);
    expect(
      filterSourceOnlySignals(
        [
          { kind: "req" } as never,
          { kind: "test" } as never,
        ],
        ["req"],
      ).map((signal) => signal.kind),
    ).toEqual(["req"]);
    expect(filterSourceOnlySignals([{ kind: "req" } as never], []).length).toBe(
      1,
    );
    expect(stringLogicClaims(["a", 1, "b"])).toEqual(["a", "b"]);
    expect(stringLogicClaims("nope")).toEqual([]);
    expect(finishedAtPrecedesStartedAt(10, 9)).toBe(true);
    expect(finishedAtPrecedesStartedAt(10, 11)).toBe(false);
    expect(finishedAtPrecedesStartedAt(null, 9)).toBe(false);
    expect(exitCodeFromCliFailure(new Error("boom"))).toBe(1);
    expect(exitCodeFromCliFailure("nope")).toBe(1);
    expect(optionalPredicateName("retains")).toBe("retains");
    expect(optionalPredicateName(12)).toBeUndefined();
    expect(
      predicateSchemaFromEntity({
        fact_kind: "predicate_schema",
        predicate_name: 12,
      }),
    ).toEqual([]);
    expect(
      wrongKindRelationshipError("constrains", "FACT-1", "property_value")
        .message,
    ).toMatch(/Property_value facts cannot be direct targets/);
    expect(
      wrongKindRelationshipError("requires_property", "FACT-1", "subject")
        .message,
    ).toMatch(/Subject facts cannot be direct targets/);
    const workspace = mkdtempSync(join(tmpdir(), "kibi-r11-restore-"));
    const created = join(workspace, "created.yaml");
    writeFileSync(created, "new\n");
    restoreOrUnlinkCoordinateArtifact(created, null);
    const existing = join(workspace, "coords.yaml");
    writeFileSync(existing, "before\n");
    restoreOrUnlinkCoordinateArtifact(existing, "restored\n");
    expect(readFileSync(existing, "utf8")).toBe("restored\n");
    const first = () => undefined;
    const second = () => undefined;
    expect(registerProcessExitOnce(first, second, () => undefined)).toBe(first);
    let registered = 0;
    const assigned = registerProcessExitOnce(null, second, () => {
      registered += 1;
    });
    expect(assigned).toBe(second);
    expect(registered).toBe(1);
    let terminated = false;
    const bound = bindProcessExitHandler(null, () => {
      terminated = true;
    }, () => undefined);
    bound();
    expect(terminated).toBe(true);
    const prolog = new PrologProcess({ oneShot: true });
    prolog.attachProcessExitHandler(() => undefined);
    expect(
      attachmentFailureMessage({
        error: "not a git repository",
        code: "NOT_A_GIT_REPO",
      }),
    ).toMatch(/set KIBI_BRANCH explicitly/);
    expect(
      attachmentFailureMessage({
        error: "detached HEAD",
        code: "DETACHED_HEAD",
      }),
    ).toBe("Failed to resolve active branch: detached HEAD");
    expect(unreadableMigrationJournalError("mig-1.json").code).toBe(
      "MIGRATION_RECOVERY_REQUIRED",
    );
    expect(
      failedEffectStatus("kb-write", { detail: "blocked" }).status,
    ).toBe("failed");
    expect(
      failedEffectStatus("kb-write", {
        detail: "blocked",
        errorCode: "E_WRITE",
      }).errorCode,
    ).toBe("E_WRITE");
    expect(() => requireKnownSpec(undefined, "kb_status")).toThrow(
      /Unknown Kibi operation/,
    );
    expect(requireKnownSpec({ name: "kb_status" } as never, "kb_status").name).toBe(
      "kb_status",
    );
    expect(() => requireCliOperationMetadata(undefined, "kb_status")).toThrow(
      /Unknown Kibi CLI operation/,
    );
    expect(
      requireCliOperationMetadata(
        { name: "kb_status", cliName: "status", description: "ok" },
        "kb_status",
      ).cliName,
    ).toBe("status");
  });
});
