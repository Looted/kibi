/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 */

/**
 * A sync refusal. `code` names the refusal with a fixed identifier (for
 * example `PENDING_SOURCE_HASH_DRIFT`), so callers and usage telemetry can
 * tell expected refusals apart without reading the message.
 */
export class SyncError extends Error {
  readonly code: string | undefined;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "SyncError";
    this.code = code;
  }
}

/** A pending-source receipt names a path outside the workspace. */
export function pendingSourceEscapesError(relative: string): SyncError {
  return new SyncError(
    `Pending source path escapes workspace: ${relative}`,
    "PENDING_SOURCE_ESCAPES_WORKSPACE",
  );
}

/** An untracked file Kibi wrote is gone before Git tracked it. */
export function pendingSourceMissingError(relative: string): SyncError {
  return new SyncError(
    `Pending source is missing: ${relative}. If the file was deleted on purpose, run 'kibi branch recover --apply' to rebuild the branch KB from the sources that remain.`,
    "PENDING_SOURCE_MISSING",
  );
}

/**
 * An untracked file Kibi wrote was changed by something other than Kibi.
 * Sync never guesses which bytes are meant, so the message names each way
 * out: keep the edit by staging the file, or write it again through Kibi.
 */
export function pendingSourceHashDriftError(
  relative: string,
  expected?: string,
  actual?: string,
): SyncError {
  const hashes =
    expected === undefined || actual === undefined
      ? ""
      : `; expected ${expected}, found ${actual}`;
  return new SyncError(
    `Pending source hash drift blocks sync for ${relative}${hashes}. Kibi wrote this untracked file and it was edited outside Kibi since. To keep the edit, stage the file (git add ${relative}) so Git tracks the bytes Kibi compiles, then run 'kibi sync' again; or write the change through kb_upsert (CLI: kibi upsert), which records the new bytes. 'kibi branch recover --apply' does not resolve this.`,
    "PENDING_SOURCE_HASH_DRIFT",
  );
}
