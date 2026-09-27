// implements REQ-claude-code-kibi-plugin-v1
import {
  classifyPath as classifySharedPath,
  toWorkspacePath as toSharedWorkspacePath,
} from "kibi-agent-core/path-policy";
import type {
  PathKind as SharedPathKind,
  WorkspacePath as SharedWorkspacePath,
} from "kibi-agent-core/path-policy";

export type PathKind = SharedPathKind;
export type WorkspacePath = SharedWorkspacePath;

export function toWorkspacePath(
  workspaceRoot: string,
  rawPath: string,
  eventCwd?: string,
): WorkspacePath | undefined {
  return toSharedWorkspacePath(workspaceRoot, rawPath, eventCwd);
}

export function classifyPath(relativePath: string): PathKind {
  return classifySharedPath(relativePath);
}
