/*
 * Activation module entry point
 * Provides all registration helpers for the Kibi VS Code extension
 */
export { resolveWorkspaceRoot, getWorkspaceFolderUri, getCurrentBranch } from "./workspace";
export { validateMcpServerPath, findKibiMcpInPath } from "./mcp";
export {
  registerTreeView,
  type TreeViewRegistrationResult,
} from "./treeView";
export {
  registerNavigationCommands,
  type NavigationCommandsResult,
} from "./navigation";
export {
  registerTraceability,
  type TraceabilityRegistrationResult,
} from "./traceability";
export { registerContextOnOpen } from "./contextOnOpen";
export { registerBriefWatcher } from "./briefs";
