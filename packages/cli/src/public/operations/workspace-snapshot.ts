import type { OperationContext, WorkspaceSnapshot } from "./runtime-types.js";

export type WorkspaceSnapshotEvidence =
  | Readonly<{ available: true; snapshot: WorkspaceSnapshot }>
  | Readonly<{ available: false; error: string }>;

export async function readWorkspaceSnapshot(
  context: OperationContext,
): Promise<WorkspaceSnapshotEvidence> {
  if (!context.git?.workspaceSnapshot) {
    return {
      available: false,
      error:
        "The active operation runtime does not expose workspace snapshots.",
    };
  }
  try {
    return {
      available: true,
      snapshot: await context.git.workspaceSnapshot(context.workspaceRoot),
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
