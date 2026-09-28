// implements REQ-cursor-kibi-plugin-v1
import {
  canonicalKbToolName as canonicalSharedKbToolName,
  extractKbMcpToolCall as extractSharedKbMcpToolCall,
  extractKbMcpToolName as extractSharedKbMcpToolName,
  resolveKibiInterface as resolveSharedKibiInterface,
} from "kibi-agent-core/kb-mcp-tools";
import type {
  KbMcpToolCall as SharedKbMcpToolCall,
  KibiInterface as SharedKibiInterface,
  McpState as SharedMcpState,
} from "kibi-agent-core/kb-mcp-tools";

export type KbMcpToolCall = SharedKbMcpToolCall;
export type McpState = SharedMcpState;
export type KibiInterface = SharedKibiInterface;

export function canonicalKbToolName(
  toolName: string | undefined,
): string | undefined {
  return canonicalSharedKbToolName(toolName);
}

export function resolveKibiInterface(
  mcpState: McpState,
  workspaceTrusted: boolean,
): KibiInterface {
  return resolveSharedKibiInterface(mcpState, workspaceTrusted);
}

export function extractKbMcpToolCall(
  toolName: string | undefined,
  toolInput: unknown,
): KbMcpToolCall | undefined {
  return extractSharedKbMcpToolCall(toolName, toolInput);
}

export function extractKbMcpToolName(
  toolName: string | undefined,
  toolInput: unknown,
): string | undefined {
  return extractSharedKbMcpToolName(toolName, toolInput);
}
