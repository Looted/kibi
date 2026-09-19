/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { loadEntities } from "../../public/operations/discovery-entities.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import { projectEntityProperties } from "../mutation/entity-projection.js";
import { resolveContainedSourcePath } from "../mutation/source-authoring.js";
import { executeUpsert } from "../mutation/upsert.js";
import { removeFrontmatterBlock } from "./receipt-document.js";

// implements REQ-kibi-verification-evidence-contract
export type MigrateLegacyReceiptsArgs = Readonly<{
  /** Migrate a single test entity only. */
  // implements REQ-kibi-verification-evidence-contract
  testId?: string;
}>;

// implements REQ-kibi-verification-evidence-contract
export type MigrateLegacyReceiptsResult = Readonly<{
  // implements REQ-kibi-verification-evidence-contract
  migrated: number;
  tests: readonly { readonly testId: string }[];
}>;

/**
 * Drop legacy `verification_receipts` frontmatter blocks from test documents
 * that already carry a `proof_contract`.
 *
 * The proof architecture replaced verification evidence with proof
 * contracts/receipts, but hand-migrated workspaces kept the old blocks (with
 * stale snapshot hashes) in ~dozens of test files, making live-receipt
 * greps error-prone. This maintenance action strips the legacy block from
 * the authored document and the compiled entity — one block splice, no
 * canonical re-render.
 */
// implements REQ-kibi-verification-evidence-contract
export async function executeMigrateLegacyReceipts(
  args: MigrateLegacyReceiptsArgs,
  context: OperationContext,
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: MigrateLegacyReceiptsResult;
}> {
  if (!context.prolog)
    throw new Error("Legacy receipt migration requires a Prolog runtime");
  if (context.fs === undefined)
    throw new Error(
      "Legacy receipt migration failed: this maintenance action rewrites authored test documents and requires a filesystem-capable runtime",
    );
  const tests = await loadEntities(context.prolog, {
    type: "test",
    ...(args.testId === undefined ? {} : { id: args.testId }),
  });
  if (args.testId !== undefined && tests.length === 0) {
    throw new Error(
      `Legacy receipt migration failed: test ${args.testId} was not found`,
    );
  }

  const migratedTests: { testId: string }[] = [];
  for (const test of tests) {
    const testId = String(test.id);
    const hasLegacy = Array.isArray(test.verification_receipts);
    const hasProofContract =
      test.proof_contract !== null && typeof test.proof_contract === "object";
    if (!hasLegacy || !hasProofContract) continue;

    const source = typeof test.source === "string" ? test.source : "";
    let patchedContent: string | undefined;
    if (context.fs && source !== "" && /\.(md|mdx)$/i.test(source)) {
      const absolute = resolveContainedSourcePath(
        context.workspaceRoot,
        source,
      );
      const before = await context.fs.readFile(absolute);
      patchedContent =
        removeFrontmatterBlock(before, "verification_receipts") ?? undefined;
      if (patchedContent === undefined) {
        throw new Error(
          `Legacy receipt migration failed for ${testId}: ${source} is not a patchable frontmatter document`,
        );
      }
    } else {
      throw new Error(
        `Legacy receipt migration failed for ${testId}: test source '${source || "unknown"}' is not an authored markdown document`,
      );
    }

    const properties = Object.fromEntries(
      Object.entries(projectEntityProperties(test)).filter(
        ([key]) => key !== "verification_receipts",
      ),
    );
    // Drop the legacy lane from the compiled entity; proof_receipts stay
    // untouched so append-only validation keeps holding.
    const upsertOptions =
      patchedContent === undefined
        ? {}
        : { sourceDocumentOverride: patchedContent };
    await executeUpsert(
      {
        type: "test",
        id: testId,
        properties: { ...properties },
      },
      context,
      upsertOptions,
    );
    migratedTests.push({ testId });
  }

  const summary =
    migratedTests.length === 0
      ? "No test carries a legacy verification_receipts block alongside a proof_contract."
      : `Removed legacy verification_receipts from ${migratedTests.length} test(s).`;
  return {
    content: [{ type: "text", text: `Legacy receipts migrated. ${summary}` }],
    structuredContent: { migrated: migratedTests.length, tests: migratedTests },
  };
}
