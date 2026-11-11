import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { Command } from "commander";
import { loadOperationSpec } from "../src/cli-operation-loader.js";
import {
  INTEGRATED_OPERATIONS,
  missingInputMessage,
  printOperationInputSchema,
  registerJsonOnlyCommands,
} from "../src/cli-register-json.js";
import * as telemetry from "../src/usage-telemetry.js";

afterEach(() => {
  process.exitCode = 0;
});

function capture(stream: NodeJS.WriteStream) {
  const writes: string[] = [];
  const spy = spyOn(stream, "write").mockImplementation((chunk: unknown) => {
    writes.push(String(chunk));
    return true;
  });
  return {
    text: () => writes.join(""),
    restore: () => spy.mockRestore(),
  };
}

async function run(args: string[]) {
  const program = new Command().name("kibi").exitOverride();
  registerJsonOnlyCommands(program);
  const out = capture(process.stdout);
  const err = capture(process.stderr);
  try {
    await program.parseAsync(args, { from: "user" });
  } finally {
    out.restore();
    err.restore();
  }
  return { stdout: out.text(), stderr: err.text() };
}

describe("JSON-only command routes", () => {
  test("the integrated operations are exactly the ones with their own flags", () => {
    expect([...INTEGRATED_OPERATIONS].sort()).toStrictEqual([
      "kb_check",
      "kb_coverage",
      "kb_find_gaps",
      "kb_graph",
      "kb_query",
      "kb_search",
      "kb_status",
    ]);
  });

  test("the missing-input message names both ways to pass input", () => {
    expect(missingInputMessage("plan-bootstrap")).toBe(
      "Error [MISSING_INPUT]: The --input option is required for this command. Pass a JSON file path, or '-' to read standard input, for example: echo '{}' | kibi plan-bootstrap --input -. Run 'kibi plan-bootstrap --schema' to print the input fields it accepts.\n",
    );
  });

  test("printOperationInputSchema prints the business input schema", async () => {
    const spec = await loadOperationSpec("kb_plan_bootstrap");
    const out = capture(process.stdout);
    try {
      await printOperationInputSchema("kb_plan_bootstrap");
    } finally {
      out.restore();
    }
    expect(out.text()).toBe(
      `${JSON.stringify(spec.businessInputSchema, null, 2)}\n`,
    );
  });

  test("--schema prints the schema and runs nothing else", async () => {
    const spec = await loadOperationSpec("kb_skills_list");
    const result = await run(["skills-list", "--schema"]);
    expect(result).toStrictEqual({
      stdout: `${JSON.stringify(spec.businessInputSchema, null, 2)}\n`,
      stderr: "",
    });
    expect(process.exitCode).toBe(0);
  });

  test("without --input the command refuses with exit code 2", async () => {
    const noted = spyOn(telemetry, "noteCliErrorCategory").mockImplementation(
      () => {},
    );
    try {
      const result = await run(["skills-list"]);
      expect(result).toStrictEqual({
        stdout: "",
        stderr: missingInputMessage("skills-list"),
      });
      expect(noted.mock.calls).toStrictEqual([["MISSING_INPUT"]]);
    } finally {
      noted.mockRestore();
    }
    expect(process.exitCode).toBe(2);
  });
});
