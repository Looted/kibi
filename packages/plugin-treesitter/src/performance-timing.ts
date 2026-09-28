import type { TreeSitterLanguage } from "./catalog.js";

export const MAX_SOURCE_ANALYSIS_TIMING_EVENTS = 5_000;
export const MAX_SOURCE_ANALYSIS_TIMING_BYTES = 512 * 1024;

export interface SourceAnalysisTimingEvent {
  readonly kind: "source-analysis";
  readonly language: TreeSitterLanguage;
  readonly parserInitializationWallMs: number;
  readonly parseWallMs: number;
  readonly analysisWallMs: number;
  readonly totalAnalysisWallMs: number;
}

export interface SourceAnalysisTimingLimits {
  readonly maxEvents: number;
  readonly maxBytes: number;
}

const PREFIX = "[kibi-performance] ";

function timingLimitLine(reason: "event_limit" | "byte_limit"): string {
  return `${PREFIX}${JSON.stringify({
    kind: "source-analysis-truncated",
    reason,
  })}\n`;
}

/**
 * Creates a bounded host-side writer for opt-in source-analysis observations.
 * One final marker is reserved so readers can distinguish complete data from
 * a stream stopped by either bound. A failing writer disables observations.
 */
export function createBoundedSourceAnalysisTimingEmitter(
  write: (line: string) => void,
  limits: SourceAnalysisTimingLimits = {
    maxEvents: MAX_SOURCE_ANALYSIS_TIMING_EVENTS,
    maxBytes: MAX_SOURCE_ANALYSIS_TIMING_BYTES,
  },
): (event: SourceAnalysisTimingEvent) => void {
  const eventLimit = Math.max(1, Math.floor(limits.maxEvents));
  const byteLimit = Math.max(1, Math.floor(limits.maxBytes));
  const maxMarkerBytes = Math.max(
    Buffer.byteLength(timingLimitLine("event_limit"), "utf8"),
    Buffer.byteLength(timingLimitLine("byte_limit"), "utf8"),
  );
  let bytesWritten = 0;
  let linesWritten = 0;
  let disabled = false;

  const stopWithMarker = (reason: "event_limit" | "byte_limit"): void => {
    if (disabled) return;
    disabled = true;
    const marker = timingLimitLine(reason);
    const markerBytes = Buffer.byteLength(marker, "utf8");
    if (linesWritten >= eventLimit || bytesWritten + markerBytes > byteLimit)
      return;
    try {
      write(marker);
      linesWritten += 1;
      bytesWritten += markerBytes;
    } catch {
      // Optional observation output must not affect source analysis.
    }
  };

  return (event: SourceAnalysisTimingEvent): void => {
    if (disabled) return;
    const line = `${PREFIX}${JSON.stringify(event)}\n`;
    const lineBytes = Buffer.byteLength(line, "utf8");
    if (
      linesWritten + 1 >= eventLimit ||
      bytesWritten + lineBytes > byteLimit - maxMarkerBytes
    ) {
      stopWithMarker(
        linesWritten + 1 >= eventLimit ? "event_limit" : "byte_limit",
      );
      return;
    }
    try {
      write(line);
      linesWritten += 1;
      bytesWritten += lineBytes;
    } catch {
      disabled = true;
    }
  };
}
