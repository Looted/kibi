import { describe, expect, test } from "bun:test";
import { InputError, OperationError, codedErrorOf } from "../src/cli-errors.js";

describe("InputError and OperationError", () => {
  test("InputError is a non-retryable exit-2 error", () => {
    const error = new InputError("BAD_INPUT", "no such flag");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("InputError");
    expect(error.message).toBe("no such flag");
    expect(error.code).toBe("BAD_INPUT");
    expect(error.detail).toBe("no such flag");
    expect(error.exitCode).toBe(2);
    expect(error.retryable).toBe(false);
  });

  test("OperationError is an exit-1 error, retryable unless told otherwise", () => {
    const error = new OperationError("ENGINE_DOWN", "engine stopped");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("OperationError");
    expect(error.message).toBe("engine stopped");
    expect(error.code).toBe("ENGINE_DOWN");
    expect(error.detail).toBe("engine stopped");
    expect(error.exitCode).toBe(1);
    expect(error.retryable).toBe(true);
    expect(new OperationError("X", "y", false).retryable).toBe(false);
  });
});

function foreign(
  name: string,
  fields: Record<string, unknown>,
  message = "foreign message",
): Error {
  const error = new Error(message);
  error.name = name;
  return Object.assign(error, fields);
}

describe("codedErrorOf", () => {
  test("reads the fields of local error classes", () => {
    expect(codedErrorOf(new InputError("BAD_INPUT", "detail"))).toStrictEqual({
      code: "BAD_INPUT",
      message: "detail",
      retryable: false,
    });
    expect(
      codedErrorOf(new OperationError("lower-case ok", "op detail", false)),
    ).toStrictEqual({
      code: "lower-case ok",
      message: "op detail",
      retryable: false,
    });
  });

  test("returns null for values that are not coded errors", () => {
    expect(codedErrorOf("InputError")).toBeNull();
    expect(codedErrorOf({ name: "InputError", code: "X" })).toBeNull();
    expect(codedErrorOf(null)).toBeNull();
    expect(codedErrorOf(new Error("plain"))).toBeNull();
    expect(codedErrorOf(foreign("TypeError", { code: "X" }))).toBeNull();
    expect(codedErrorOf(foreign("InputError", {}))).toBeNull();
    expect(codedErrorOf(foreign("InputError", { code: 7 }))).toBeNull();
    expect(codedErrorOf(foreign("InputError", { code: ["X"] }))).toBeNull();
  });

  test("requires the whole code to be upper snake case", () => {
    expect(codedErrorOf(foreign("InputError", { code: "bad" }))).toBeNull();
    expect(codedErrorOf(foreign("InputError", { code: "1BAD" }))).toBeNull();
    expect(codedErrorOf(foreign("InputError", { code: "BAD-X" }))).toBeNull();
    expect(codedErrorOf(foreign("InputError", { code: "X BAD" }))).toBeNull();
    expect(codedErrorOf(foreign("InputError", { code: "" }))).toBeNull();
    expect(
      codedErrorOf(foreign("InputError", { code: "A1_B2" })),
    ).toStrictEqual({
      code: "A1_B2",
      message: "foreign message",
      retryable: false,
    });
  });

  test("accepts bundled copies by name and fills defaults", () => {
    expect(
      codedErrorOf(
        foreign("OperationError", {
          code: "X",
          detail: "the detail",
          retryable: false,
        }),
      ),
    ).toStrictEqual({ code: "X", message: "the detail", retryable: false });
    expect(
      codedErrorOf(foreign("OperationError", { code: "X" })),
    ).toStrictEqual({
      code: "X",
      message: "foreign message",
      retryable: true,
    });
    expect(
      codedErrorOf(
        foreign("InputError", { code: "X", detail: 5, retryable: "yes" }),
      ),
    ).toStrictEqual({
      code: "X",
      message: "foreign message",
      retryable: false,
    });
    expect(
      codedErrorOf(foreign("InputError", { code: "X", retryable: true })),
    ).toStrictEqual({ code: "X", message: "foreign message", retryable: true });
  });
});
