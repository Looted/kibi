import { readFile } from "node:fs/promises";
import path from "node:path";
import { InputError } from "./cli-errors.js";

// implements REQ-kibi-operation-interface-parity
export type LoadInputOptions = {
  readonly input?: string;
  readonly cwd: string;
};

let stdinConsumed = false;

async function readStdinOnce(): Promise<string> {
  if (stdinConsumed) {
    throw new InputError(
      "STDIN_ALREADY_READ",
      "Standard input can only be consumed once.",
    );
  }
  stdinConsumed = true;

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readInputText(options: LoadInputOptions): Promise<string> {
  if (options.input === undefined) {
    throw new InputError("MISSING_INPUT", "The --input option is required.");
  }
  if (options.input === "-") {
    return readStdinOnce();
  }

  const filePath = path.resolve(options.cwd, options.input);
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error instanceof Error) {
      throw new InputError(
        "INPUT_READ_FAILED",
        `Unable to read JSON input '${options.input}': ${error.message}`,
      );
    }
    throw error;
  }
}

// implements REQ-kibi-operation-interface-parity
export async function loadInput(options: LoadInputOptions): Promise<unknown> {
  const text = await readInputText(options);
  if (text.trim().length === 0) {
    throw new InputError("EMPTY_INPUT", "JSON input is empty.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new InputError("INVALID_JSON", `Invalid JSON input: ${error.message}`);
    }
    throw error;
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new InputError(
      "INVALID_INPUT_ROOT",
      "JSON input must be an object.",
    );
  }
  return parsed;
}
