export interface SessionFingerprintInput {
  sessionId?: string | undefined;
  branch: string;
  worktree: string;
}

export interface SessionBaselineState<Cursor> {
  fingerprint: string | null;
  cursor: Cursor | null;
}

export function buildSessionFingerprint( // implements REQ-opencode-kibi-briefing-v6
  input: SessionFingerprintInput,
): string {
  return [input.sessionId?.trim() || "unknown", input.branch, input.worktree].join(
    "\0",
  );
}

export function syncSessionBaselineState( // implements REQ-opencode-kibi-briefing-v6
  state: SessionBaselineState<Cursor>,
  input: SessionFingerprintInput,
  captureBaseline: () => Cursor | null,
): SessionBaselineState<Cursor> {
  const fingerprint = buildSessionFingerprint(input);
  if (state.fingerprint === fingerprint) {
    return state;
  }

  return {
    fingerprint,
    cursor: captureBaseline(),
  };
}
