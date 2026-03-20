// implements REQ-opencode-kibi-plugin-v1

import * as logger from "./logger.js";

export type WarningCategory =
  | "kb-edit"
  | "embedded-scenario-in-req"
  | "embedded-test-in-req"
  | "long-comment-missed-fact"
  | "long-comment-missed-adr"
  | "missing-traceability"
  | "bootstrap-needed";

export interface WarningEvent {
  category: WarningCategory;
  path: string;
  timestamp: number;
  message: string;
}

export interface SessionSummary {
  totalWarnings: number;
  warningsByCategory: Record<WarningCategory, number>;
  repeatedPatterns: Array<{ category: WarningCategory; count: number }>;
  topFilesWithWarnings: Array<{ path: string; count: number }>;
}

const WARNING_THRESHOLD_REPEAT = 3;
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

class SessionTracker {
  private warnings: WarningEvent[] = [];
  private sessionStart: number;

  constructor() {
    this.sessionStart = Date.now();
  }

  /**
   * Record a warning event.
   */
  recordWarning(
    category: WarningCategory,
    path: string,
    message: string,
  ): void {
    const event: WarningEvent = {
      category,
      path,
      timestamp: Date.now(),
      message,
    };
    this.warnings.push(event);

    // Log with category prefix for richer filtering
    this.logWarning(category, message);

    // Check for repeated patterns
    this.checkRepeatedPattern(category);
  }

  /**
   * Generate a session summary of warnings and patterns.
   */
  generateSummary(): SessionSummary {
    const byCategory: Record<WarningCategory, number> = {
      "kb-edit": 0,
      "embedded-scenario-in-req": 0,
      "embedded-test-in-req": 0,
      "long-comment-missed-fact": 0,
      "long-comment-missed-adr": 0,
      "missing-traceability": 0,
      "bootstrap-needed": 0,
    };

    const byFile: Record<string, number> = {};

    for (const warning of this.warnings) {
      byCategory[warning.category]++;
      byFile[warning.path] = (byFile[warning.path] || 0) + 1;
    }

    const repeatedPatterns = Object.entries(byCategory)
      .filter(([, count]) => count >= WARNING_THRESHOLD_REPEAT)
      .map(([category, count]) => ({
        category: category as WarningCategory,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const topFiles = Object.entries(byFile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([path, count]) => ({ path, count }));

    return {
      totalWarnings: this.warnings.length,
      warningsByCategory: byCategory,
      repeatedPatterns,
      topFilesWithWarnings: topFiles,
    };
  }

  /**
   * Log a summary at session end or on demand.
   */
  logSummary(): void {
    const summary = this.generateSummary();

    if (summary.totalWarnings === 0) {
      logger.info("session.summary: No warnings recorded");
      return;
    }

    logger.info(`session.summary: ${summary.totalWarnings} total warnings`);

    for (const [category, count] of Object.entries(
      summary.warningsByCategory,
    )) {
      if (count > 0) {
        logger.info(`  ${category}: ${count}`);
      }
    }

    if (summary.repeatedPatterns.length > 0) {
      logger.warn("session.patterns: Repeated anti-patterns detected:");
      for (const pattern of summary.repeatedPatterns) {
        logger.warn(`  ${pattern.category}: ${pattern.count} occurrences`);
      }
    }
  }

  /**
   * Reset the session.
   */
  reset(): void {
    this.warnings = [];
    this.sessionStart = Date.now();
  }

  /**
   * Check if session has expired.
   */
  isSessionExpired(intervalMs = SESSION_DURATION_MS): boolean {
    return Date.now() - this.sessionStart > intervalMs;
  }

  private logWarning(category: WarningCategory, message: string): void {
    const prefix = `[${category}]`;
    switch (category) {
      case "kb-edit":
        logger.warn(`${prefix} ${message}`);
        break;
      case "bootstrap-needed":
        logger.warn(`${prefix} ${message}`);
        break;
      case "missing-traceability":
        logger.info(`${prefix} ${message}`);
        break;
      default:
        logger.info(`${prefix} ${message}`);
    }
  }

  private checkRepeatedPattern(category: WarningCategory): void {
    const count = this.warnings.filter((w) => w.category === category).length;
    if (count === WARNING_THRESHOLD_REPEAT) {
      logger.warn(
        `pattern.repeat: ${category} has occurred ${count} times. Consider addressing this pattern systematically.`,
      );
    }
  }
}

// Singleton instance
let globalTracker: SessionTracker | null = null;

export function getSessionTracker(): SessionTracker {
  if (!globalTracker) {
    globalTracker = new SessionTracker();
  }
  return globalTracker;
}

export function resetSessionTracker(): void {
  globalTracker = new SessionTracker();
}

export { SessionTracker };
