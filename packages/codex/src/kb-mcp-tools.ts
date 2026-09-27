// implements REQ-codex-kibi-plugin-v1
import {
  canonicalKbToolName as canonicalSharedKbToolName,
  extractKbMcpToolCall as extractSharedKbMcpToolCall,
} from "kibi-agent-core/kb-mcp-tools";
import type { KbMcpToolCall as SharedKbMcpToolCall } from "kibi-agent-core/kb-mcp-tools";

export type KbMcpToolCall = SharedKbMcpToolCall;

export function canonicalKbToolName(
  toolName: string | undefined,
): string | undefined {
  return canonicalSharedKbToolName(toolName);
}

export function extractKbMcpToolCall(
  toolName: string | undefined,
  toolInput: unknown,
): KbMcpToolCall | undefined {
  return extractSharedKbMcpToolCall(toolName, toolInput);
}
