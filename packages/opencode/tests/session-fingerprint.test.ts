import { describe, expect, it } from "bun:test";

import {
  buildSessionFingerprint,
  syncSessionBaselineState,
} from "../src/session-fingerprint";

describe("session-fingerprint", () => {
  it("combines sessionId, branch, and worktree into a stable fingerprint", () => {
    const fingerprint = buildSessionFingerprint({
      sessionId: "session-1",
      branch: "main",
      worktree: "/repo/worktree",
    });

    expect(fingerprint).toBe(
      buildSessionFingerprint({
        sessionId: "session-1",
        branch: "main",
        worktree: "/repo/worktree",
      }),
    );
  });

  it("changes when the sessionId changes", () => {
    expect(
      buildSessionFingerprint({
        sessionId: "session-1",
        branch: "main",
        worktree: "/repo/worktree",
      }),
    ).not.toBe(
      buildSessionFingerprint({
        sessionId: "session-2",
        branch: "main",
        worktree: "/repo/worktree",
      }),
    );
  });

  it("changes when the branch changes", () => {
    expect(
      buildSessionFingerprint({
        sessionId: "session-1",
        branch: "main",
        worktree: "/repo/worktree",
      }),
    ).not.toBe(
      buildSessionFingerprint({
        sessionId: "session-1",
        branch: "feature",
        worktree: "/repo/worktree",
      }),
    );
  });

  it("normalizes an empty sessionId to unknown", () => {
    expect(
      buildSessionFingerprint({
        sessionId: "",
        branch: "main",
        worktree: "/repo/worktree",
      }),
    ).toBe(
      buildSessionFingerprint({
        sessionId: "unknown",
        branch: "main",
        worktree: "/repo/worktree",
      }),
    );
  });

  it("captures a baseline once for the same session/branch/worktree fingerprint", () => {
    let captures = 0;
    const state = syncSessionBaselineState(
      {
        fingerprint: null,
        cursor: null as string | null,
      },
      {
        sessionId: "session-1",
        branch: "main",
        worktree: "/repo/worktree",
      },
      () => {
        captures += 1;
        return "cursor-1";
      },
    );

    const unchangedState = syncSessionBaselineState(
      state,
      {
        sessionId: "session-1",
        branch: "main",
        worktree: "/repo/worktree",
      },
      () => {
        captures += 1;
        return "cursor-2";
      },
    );

    expect(captures).toBe(1);
    expect(unchangedState.cursor).toBe("cursor-1");
  });

  it("resets the captured baseline when the branch changes", () => {
    const initialState = syncSessionBaselineState(
      {
        fingerprint: null,
        cursor: null as string | null,
      },
      {
        sessionId: "session-1",
        branch: "main",
        worktree: "/repo/worktree",
      },
      () => "cursor-main",
    );

    const nextState = syncSessionBaselineState(
      initialState,
      {
        sessionId: "session-1",
        branch: "feature",
        worktree: "/repo/worktree",
      },
      () => "cursor-feature",
    );

    expect(nextState.cursor).toBe("cursor-feature");
    expect(nextState.fingerprint).not.toBe(initialState.fingerprint);
  });
});
