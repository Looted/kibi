import type { StagedPath } from "../traceability/git-staged.js";
import type {
  HostSourceAnalysisResultV2,
  SourceAnalysisService,
} from "./source-analysis-service.js";

// implements REQ-014
export interface SourceChangeAnalysis {
  path: string;
  before: HostSourceAnalysisResultV2 | null;
  after: HostSourceAnalysisResultV2 | null;
}

/** Analyze both versions without changing the complete inventory or assigning proof. */
// implements REQ-014
export async function analyzeSourceChanges(
  inventory: readonly StagedPath[],
  service: SourceAnalysisService,
): Promise<Map<string, SourceChangeAnalysis>> {
  const changes = new Map<string, SourceChangeAnalysis>();
  for (const file of inventory) {
    if (file.analysisDepth === "metadata" || file.skipReason) continue;
    const before =
      file.previousContent === undefined
        ? null
        : await service.analyzeTextV2(
            file.oldPath ?? file.copyFromPath ?? file.path,
            file.previousContent,
          );
    const after =
      file.content === undefined
        ? null
        : await service.analyzeTextV2(file.path, file.content);
    changes.set(file.path, { path: file.path, before, after });
  }
  return changes;
}
