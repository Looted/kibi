import type {
  HostSourceAnalysisResultV2,
  SourceAnalysisService,
} from "../plugins/source-analysis-service.js";
import { analyzeSourceChanges } from "../plugins/source-change-analysis.js";
import type { GitChangeSnapshot } from "./git-change-snapshot.js";
import {
  evaluateImpactReview,
  loadBaseImpactPolicy,
} from "./impact-evaluator.js";
import type { Fingerprint } from "./impact-review.js";

/** Authorize lexical coordinate migration only from a captured local staged review.
 * Protected PR hosts must use their target-base evaluator, not this HEAD policy. */
export function createReviewedDecoratorCoordinateVerifier(
  snapshot: GitChangeSnapshot,
  service: SourceAnalysisService,
  bindings: {
    providerSetFingerprint: Fingerprint;
    evaluatorFingerprint: Fingerprint;
  },
): (path: string, analysis: HostSourceAnalysisResultV2) => Promise<void> {
  if (process.env.CI)
    throw new Error(
      "Reviewed partial coordinate migration is unavailable in CI without a protected target-base snapshot",
    );
  const policy = loadBaseImpactPolicy(snapshot);
  let reviewValidation: Promise<void> | undefined;
  return async (path, analysis) => {
    snapshot.assertUnchanged();
    if (
      analysis.status !== "partial" ||
      analysis.language !== "python" ||
      analysis.sourceFile !== path ||
      analysis.module.analysisMode !== "parser" ||
      analysis.stamp?.pluginId !== "kibi-plugin-treesitter" ||
      analysis.uncoveredRanges.length === 0 ||
      analysis.providerId !== "kibi-plugin-treesitter.tree-sitter.v2" ||
      analysis.diagnostics.length === 0 ||
      analysis.providerFingerprint === null ||
      !analysis.diagnostics.every(
        (diagnostic) =>
          diagnostic.code === "TREESITTER_DECORATOR_EXPANSION_UNAVAILABLE" &&
          policy.allowedPartial.some(
            (allowed) =>
              allowed.providerId === analysis.providerId &&
              allowed.providerFingerprint ===
                `sha256:${analysis.providerFingerprint}` &&
              allowed.diagnosticCode === diagnostic.code &&
              allowed.limitationClass === "python-decorator-expansion",
          ),
      )
    )
      throw new Error(
        `Decorator coordinates for ${path} are not allowed by the captured base policy`,
      );
    reviewValidation ??= (async () => {
      const analyses = await analyzeSourceChanges(snapshot.inventory, service);
      // Use the same host normalization as staged check, without changing the
      // original captured inventory used by the generated-byte comparison.
      const evaluatedSnapshot: GitChangeSnapshot = {
        ...snapshot,
        inventory: snapshot.inventory.map((file) =>
          analyses.get(file.path)?.after?.status === "ok"
            ? { ...file, analysisDepth: "symbol", disposition: "checked" }
            : { ...file },
        ),
      };
      const result = evaluateImpactReview(evaluatedSnapshot, {
        ...bindings,
        analyses,
      });
      if (!result.passed)
        throw new Error(
          `Reviewed coordinate migration failed: ${result.diagnostics.map((diagnostic) => diagnostic.message).join("; ")}`,
        );
      snapshot.assertUnchanged();
    })();
    await reviewValidation;
    snapshot.assertUnchanged();
  };
}
