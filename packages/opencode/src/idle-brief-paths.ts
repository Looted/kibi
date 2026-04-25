import * as path from "node:path";
import * as fs from "node:fs";

export function resolveBriefsDir(workspaceRoot: string): string { // implements REQ-opencode-kibi-briefing-v3
  return path.join(workspaceRoot, ".kb", "briefs");
}

export function resolveAuditLogPath(workspaceRoot: string, branch: string): string { // implements REQ-opencode-kibi-briefing-v3
  return path.join(workspaceRoot, ".kb", "branches", branch, "audit.log");
}

export function resolveBriefFilePath(workspaceRoot: string, timestamp: number): string { // implements REQ-opencode-kibi-briefing-v3
  return path.join(resolveBriefsDir(workspaceRoot), `${timestamp}_brief.json`);
}

export function resolveTempBriefPath(workspaceRoot: string, timestamp: number): string { // implements REQ-opencode-kibi-briefing-v3
  return path.join(resolveBriefsDir(workspaceRoot), `${timestamp}_brief.json.tmp`);
}

export function atomicWriteBrief(workspaceRoot: string, timestamp: number, content: string): void { // implements REQ-opencode-kibi-briefing-v3
  const briefsDir = resolveBriefsDir(workspaceRoot);
  if (!fs.existsSync(briefsDir)) {
    fs.mkdirSync(briefsDir, { recursive: true });
  }
  const tempPath = resolveTempBriefPath(workspaceRoot, timestamp);
  const finalPath = resolveBriefFilePath(workspaceRoot, timestamp);
  fs.writeFileSync(tempPath, content, "utf-8");
  fs.renameSync(tempPath, finalPath);
}
