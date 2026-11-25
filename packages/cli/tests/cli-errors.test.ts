import { describe, expect, test } from "bun:test";
import {
  BranchResolutionFailure,
  GitRequired,
  InputError,
  KbRejection,
  OperationError,
  codedErrorOf,
  isKbRejection,
  prefixedFailure,
} from "../src/cli-errors.js";

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

  test("OperationError is an exit-1 error, not retryable unless told so", () => {
    const error = new OperationError("ENGINE_DOWN", "engine stopped");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("OperationError");
    expect(error.message).toBe("engine stopped");
    expect(error.code).toBe("ENGINE_DOWN");
    expect(error.detail).toBe("engine stopped");
    expect(error.exitCode).toBe(1);
    expect(error.retryable).toBe(false);
    expect(new OperationError("X", "y", true).retryable).toBe(true);
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
      retryable: false,
    });
    expect(
      codedErrorOf(foreign("OperationError", { code: "X", retryable: true })),
    ).toStrictEqual({ code: "X", message: "foreign message", retryable: true });
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

describe("KbRejection and prefixedFailure", () => {
  test("a rejection has no issues unless given some", () => {
    const rejection = new KbRejection("ENTITY_NOT_FOUND", "no such id");
    expect(rejection).toBeInstanceOf(Error);
    expect(rejection.code).toBe("ENTITY_NOT_FOUND");
    expect(rejection.message).toBe("no such id");
    expect(rejection.issues).toStrictEqual([]);
  });

  test("prefixes the message and keeps a rejection's code and issues", () => {
    const issues = [{ rule: "required", field: "title" }];
    const wrapped = prefixedFailure(
      "Upsert failed: ",
      new KbRejection("ENTITY_VALIDATION_FAILED", "bad", issues),
    );
    expect(wrapped).toBeInstanceOf(KbRejection);
    expect(wrapped.message).toBe("Upsert failed: bad");
    expect((wrapped as KbRejection).code).toBe("ENTITY_VALIDATION_FAILED");
    expect((wrapped as KbRejection).issues).toBe(issues);
    for (const [error, message] of [
      [new TypeError("boom"), "P: boom"],
      ["text", "P: text"],
    ] as const) {
      const plain = prefixedFailure("P: ", error);
      expect(plain).not.toBeInstanceOf(KbRejection);
      expect(plain.constructor).toBe(Error);
      expect(plain.message).toBe(message);
      expect(plain.cause).toBe(error);
    }
  });
});

describe("isKbRejection", () => {
  test("finds a rejection itself or as a wrapper's cause", () => {
    const rejection = new KbRejection("VALIDATION_FAILED", "refused");
    expect(isKbRejection(rejection)).toBe(true);
    expect(isKbRejection(new Error("wrapped", { cause: rejection }))).toBe(
      true,
    );
    expect(
      isKbRejection(
        new Error("outer", {
          cause: new Error("inner", { cause: rejection }),
        }),
      ),
    ).toBe(true);
    expect(
      isKbRejection(prefixedFailure("Upsert execution failed: ", rejection)),
    ).toBe(true);
  });

  test("anything else is not a rejection", () => {
    expect(isKbRejection(new Error("plain"))).toBe(false);
    expect(isKbRejection(new Error("x", { cause: "not an error" }))).toBe(
      false,
    );
    expect(isKbRejection(new OperationError("X", "y"))).toBe(false);
    expect(isKbRejection("VALIDATION_FAILED")).toBe(false);
    expect(isKbRejection(undefined)).toBe(false);
  });

  test("stops after five wrappers", () => {
    let wrapped: Error = new KbRejection("VALIDATION_FAILED", "deep");
    for (let depth = 0; depth < 4; depth += 1)
      wrapped = new Error(`w${depth}`, { cause: wrapped });
    expect(isKbRejection(wrapped)).toBe(true);
    expect(isKbRejection(new Error("w4", { cause: wrapped }))).toBe(false);
  });
});

describe("BranchResolutionFailure", () => {
  test("a repository Git refuses says how to find out why, with a code", () => {
    const failure = new BranchResolutionFailure({
      error: "Git refuses the repository.",
      code: "GIT_REPOSITORY_UNREADABLE",
    });
    expect(failure).toBeInstanceOf(OperationError);
    // The name stays OperationError, so a bundled copy is still read.
    expect(failure.name).toBe("OperationError");
    expect(failure.code).toBe("GIT_REPOSITORY_UNREADABLE");
    expect(failure.retryable).toBe(false);
    expect(failure.exitCode).toBe(1);
    expect(failure.message).toBe(
      "Failed to resolve active branch: Git refuses the repository. Make the repository readable for this user (run 'git status' to see why Git refuses it), then retry.",
    );
    expect(failure.detail).toBe(failure.message);
    expect(codedErrorOf(failure)).toStrictEqual({
      code: "GIT_REPOSITORY_UNREADABLE",
      message: failure.message,
      retryable: false,
    });
  });

  test("without Git it says to install Git", () => {
    const failure = new BranchResolutionFailure({
      error: "Git is unavailable.",
      code: "GIT_NOT_AVAILABLE",
    });
    expect(failure.code).toBe("GIT_NOT_AVAILABLE");
    expect(failure.message).toBe(
      "Failed to resolve active branch: Git is unavailable. Install Git (or put it on PATH), then retry.",
    );
  });

  test("any other failure keeps the resolver's diagnostic", () => {
    const detached = new BranchResolutionFailure({
      error: "why",
      code: "DETACHED_HEAD",
    });
    expect([detached.code, detached.message]).toStrictEqual([
      "DETACHED_HEAD",
      "Failed to resolve active branch: why",
    ]);
    for (const code of [
      "UNBORN_BRANCH",
      "AMBIGUOUS_ATTACHMENT",
      "UNKNOWN_ERROR",
    ] as const) {
      const failure = new BranchResolutionFailure({ error: "why", code });
      expect([code, failure.code, failure.message]).toStrictEqual([
        code,
        "BRANCH_UNRESOLVED",
        "Failed to resolve active branch: why",
      ]);
    }
  });
});

describe("GitRequired", () => {
  test("is a coded refusal that is not retryable", () => {
    const failure = new GitRequired("kibi gc needs a Git repository.");
    expect(failure).toBeInstanceOf(OperationError);
    expect(codedErrorOf(failure)).toStrictEqual({
      code: "GIT_REQUIRED",
      message: "kibi gc needs a Git repository.",
      retryable: false,
    });
  });
});
