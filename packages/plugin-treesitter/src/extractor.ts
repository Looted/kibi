import { basename, extname } from "node:path";
import { Worker } from "node:worker_threads";
import type {
  SourceAnalysisResultV2,
  SourceAnalysisUncoveredRangeV2,
  SymbolExtractorV2,
  SymbolExtractorV2AnalyzeInput,
  SymbolExtractorV2SupportsInput,
} from "kibi-plugin-sdk";
import {
  type TreeSitterLanguage,
  normalizeTreeSitterLanguage,
  treeSitterLanguageForPath,
} from "./catalog.js";

const EXTRACTOR_ID = "kibi-plugin-treesitter.tree-sitter.v2";
const MAX_INPUT_CODE_UNITS = 1_048_576;
const MAX_INPUT_BYTES = 2_097_152;
const MAX_CONCURRENT_ANALYSES = 2;
const ANALYSIS_TIMEOUT_MS = 3_000;

interface WorkerSuccess {
  readonly ok: true;
  readonly status: "ok" | "partial";
  readonly symbols: SourceAnalysisResultV2["symbols"];
  readonly diagnostics: SourceAnalysisResultV2["diagnostics"];
  readonly uncoveredRanges: SourceAnalysisResultV2["uncoveredRanges"];
}

interface WorkerFailure {
  readonly ok: false;
  readonly code: string;
  readonly message: string;
}

type WorkerResult = WorkerSuccess | WorkerFailure;

function moduleTitle(filePath: string): string {
  const name = basename(filePath);
  const extension = extname(name);
  return extension.length > 0 ? name.slice(0, -extension.length) : name;
}

function fullSourceRange(content: string): SourceAnalysisUncoveredRangeV2 {
  const lines = content.split(/\r\n|\n|\r/);
  return {
    startLine: 1,
    startColumn: 0,
    endLine: lines.length,
    endColumn: lines.at(-1)?.length ?? 0,
    reason: "no-symbolic-coverage",
  };
}

function fallbackResult(
  input: SymbolExtractorV2AnalyzeInput,
  language: string,
  status: "failed" | "unsupported",
  code: string,
  message: string,
): SourceAnalysisResultV2 {
  return {
    contractVersion: "kibi.symbol-extractor.v2",
    status,
    sourceFile: input.path,
    language,
    module: {
      title: moduleTitle(input.path),
      language,
      analysisMode: "fallback",
      fallbackReason: message,
    },
    symbols: [],
    diagnostics: [{ code, message }],
    uncoveredRanges: [fullSourceRange(input.content)],
  };
}

function resolveLanguage(
  input: SymbolExtractorV2SupportsInput,
): TreeSitterLanguage | undefined {
  if (input.language !== undefined && input.language.trim().length > 0) {
    return normalizeTreeSitterLanguage(input.language);
  }
  return treeSitterLanguageForPath(input.path);
}

function withinWorker(
  language: TreeSitterLanguage,
  content: string,
): Promise<WorkerResult> {
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./analysis-worker.js", import.meta.url), {
        workerData: { language, content },
        resourceLimits: {
          maxOldGenerationSizeMb: 64,
          maxYoungGenerationSizeMb: 16,
          stackSizeMb: 4,
        },
      });
    } catch (error) {
      resolve({
        ok: false,
        code: "TREESITTER_WORKER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Could not start Tree-sitter worker.",
      });
      return;
    }
    let settled = false;
    const finish = (result: WorkerResult, terminate: boolean): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      worker.removeAllListeners();
      if (terminate) {
        void worker.terminate().finally(() => resolve(result));
        return;
      }
      resolve(result);
    };
    const timeout = setTimeout(() => {
      finish(
        {
          ok: false,
          code: "TREESITTER_ANALYSIS_TIMEOUT",
          message: `Tree-sitter analysis exceeded ${ANALYSIS_TIMEOUT_MS} ms.`,
        },
        true,
      );
    }, ANALYSIS_TIMEOUT_MS);
    worker.once("message", (result: WorkerResult) => finish(result, true));
    worker.once("error", (error: Error) =>
      finish(
        {
          ok: false,
          code: "TREESITTER_WORKER_ERROR",
          message: error.message,
        },
        true,
      ),
    );
    worker.once("exit", (code: number) => {
      if (!settled) {
        finish(
          {
            ok: false,
            code: "TREESITTER_WORKER_EXIT",
            message: `Tree-sitter worker exited before returning a result (code ${code}).`,
          },
          false,
        );
      }
    });
  });
}

function createConcurrencyLimiter(
  limit: number,
): <T>(task: () => Promise<T>) => Promise<T> {
  let active = 0;
  const waiters: Array<() => void> = [];
  return async <T>(task: () => Promise<T>): Promise<T> => {
    while (active >= limit) {
      await new Promise<void>((resolve) => waiters.push(resolve));
    }
    active += 1;
    try {
      return await task();
    } finally {
      active -= 1;
      waiters.shift()?.();
    }
  };
}

/**
 * Create the bounded, offline `kibi.symbol-extractor.v2` implementation.
 * Source bytes are only parsed by Tree-sitter; this provider never executes them.
 */
// implements REQ-source-analysis-v2
export function createTreeSitterSymbolExtractor(): SymbolExtractorV2 {
  const withConcurrencyLimit = createConcurrencyLimiter(
    MAX_CONCURRENT_ANALYSES,
  );
  return {
    id: EXTRACTOR_ID,
    supports(input: SymbolExtractorV2SupportsInput): boolean {
      return resolveLanguage(input) !== undefined;
    },
    async analyze(
      input: SymbolExtractorV2AnalyzeInput,
    ): Promise<SourceAnalysisResultV2> {
      const explicitLanguage = input.language?.trim();
      const language = resolveLanguage(input);
      if (language === undefined) {
        const requestedLanguage =
          explicitLanguage || extname(input.path) || "unknown";
        return fallbackResult(
          input,
          requestedLanguage.toLowerCase(),
          "unsupported",
          "TREESITTER_UNSUPPORTED_LANGUAGE",
          `No qualified Tree-sitter grammar is installed for '${requestedLanguage}'.`,
        );
      }

      const module = {
        title: moduleTitle(input.path),
        language,
        analysisMode: "parser" as const,
      };
      if (
        input.content.length > MAX_INPUT_CODE_UNITS ||
        Buffer.byteLength(input.content, "utf8") > MAX_INPUT_BYTES
      ) {
        return fallbackResult(
          input,
          language,
          "failed",
          "TREESITTER_INPUT_LIMIT",
          `Tree-sitter input exceeds ${MAX_INPUT_CODE_UNITS} UTF-16 code units or ${MAX_INPUT_BYTES} UTF-8 bytes.`,
        );
      }

      const result = await withConcurrencyLimit(() =>
        withinWorker(language, input.content),
      );
      if (!result.ok) {
        return fallbackResult(
          input,
          language,
          "failed",
          result.code,
          result.message,
        );
      }

      return {
        contractVersion: "kibi.symbol-extractor.v2",
        status: result.status,
        sourceFile: input.path,
        language,
        module,
        symbols: result.symbols,
        diagnostics: result.diagnostics,
        uncoveredRanges: result.uncoveredRanges,
      };
    },
  };
}

// implements REQ-source-analysis-v2
export { TREE_SITTER_LANGUAGES } from "./catalog.js";
