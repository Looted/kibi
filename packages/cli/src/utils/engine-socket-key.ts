/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { createHash } from "node:crypto";

/**
 * The 128-bit identity of the engine daemon for one workspace and branch,
 * from the workspace's canonical filesystem path. The engine names its socket
 * (or Windows pipe) `kibi-<key>` and the janitor finds a workspace's sockets
 * by the same key, so both derive it here.
 */
export function engineSocketKey(canonicalRoot: string, branch: string): string {
  return (
    createHash("sha256")
      .update(`${canonicalRoot}\0${branch}`)
      // Retain 128 bits of workspace/branch identity; runtimeDirectory budgets
      // the complete pathname rather than shortening this identity.
      .digest("hex")
      .slice(0, 32)
  );
}
