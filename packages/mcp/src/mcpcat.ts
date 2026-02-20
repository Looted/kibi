import * as mcpcat from "mcpcat";
import type { CustomEventData } from "mcpcat";
import type { QueryArgs } from "./tools/query.js";

const projectId = (process.env.MCPCAT_PROJECT_ID ?? "").trim();
const isTelemetryEnabled = Boolean(projectId);
const rawSessionId = (process.env.MCPCAT_SESSION_ID ?? "").trim();
const sessionPrefix = rawSessionId
  ? rawSessionId.replace(/\s+/g, "-")
  : `kibi-mcp-${process.pid}-${Math.floor(Date.now() / 1e3)}`;

interface QueryTelemetryPayload {
  requestId?: string | number;
  args: QueryArgs;
  resultCount?: number;
  shownCount?: number;
  durationMs?: number;
  error?: string;
}

function getSessionId(requestId?: string | number): string {
  if (requestId === undefined || requestId === null) {
    return sessionPrefix;
  }
  return `${sessionPrefix}-${String(requestId)}`;
}

function sanitizeParameters(payload: QueryTelemetryPayload): Record<string, unknown> {
  const parameters: Record<string, unknown> = {};
  if (payload.requestId !== undefined && payload.requestId !== null) {
    parameters.requestId = String(payload.requestId);
  }
  if (payload.args.type) {
    parameters.type = payload.args.type;
  }
  if (payload.args.id) {
    parameters.id = payload.args.id;
  }
  if (payload.args.tags && payload.args.tags.length > 0) {
    const maximumTagsToSend = 10;
    parameters.tags = payload.args.tags.slice(0, maximumTagsToSend);
  }
  if (payload.args.sourceFile) {
    parameters.sourceFile = payload.args.sourceFile;
  }
  if (payload.args.limit !== undefined) {
    parameters.limit = payload.args.limit;
  }
  if (payload.args.offset !== undefined) {
    parameters.offset = payload.args.offset;
  }
  if (payload.error) {
    parameters.error = payload.error;
  }
  return parameters;
}

function buildResponse(payload: QueryTelemetryPayload): Record<string, unknown> | undefined {
  const response: Record<string, unknown> = {};
  if (payload.resultCount !== undefined) {
    response.resultCount = payload.resultCount;
  }
  if (payload.shownCount !== undefined) {
    response.shownCount = payload.shownCount;
  }
  return Object.keys(response).length === 0 ? undefined : response;
}

function formatMessage(error?: string): string {
  return error ? `kb_query failed: ${error}` : "kb_query succeeded";
}

export function trackQueryUsage(payload: QueryTelemetryPayload): void {
  if (!isTelemetryEnabled) {
    return;
  }

  const parameters = sanitizeParameters(payload);
  const response = buildResponse(payload);

  const eventData: CustomEventData = {
    resourceName: "kb_query",
    duration: payload.durationMs,
    isError: Boolean(payload.error),
    message: formatMessage(payload.error),
  };

  if (Object.keys(parameters).length > 0) {
    eventData.parameters = parameters;
  }

  if (response) {
    eventData.response = response;
  }

  if (payload.error) {
    eventData.error = { message: payload.error };
  }

  void mcpcat.publishCustomEvent(getSessionId(payload.requestId), projectId, eventData).catch((error) => {
    const details = error instanceof Error ? error.message : String(error);
    console.error(`[MCPcat] Failed to publish query analytics: ${details}`);
  });
}
