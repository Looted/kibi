/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

function getEnvValue(key: string): string | undefined {
  return process.env[key];
}

export function getBranchOverride(): string | undefined {
  // Branch identity is exact and must not be normalized. Preserve whitespace
  // so the Git-ref validator rejects an accidental value instead of silently
  // attaching a different branch.
  // An empty value means no override.
  return getEnvValue("KIBI_BRANCH") || undefined;
}

export function getKbPlPathOverride(): string | undefined {
  // implements REQ-003
  return getEnvValue("KIBI_KB_PL_PATH");
}

export function isCliDebugEnabled(): boolean {
  // implements REQ-003
  return Boolean(getEnvValue("KIBI_DEBUG"));
}

export function isCliTraceEnabled(): boolean {
  // implements REQ-003
  return Boolean(getEnvValue("KIBI_TRACE"));
}

export function isCliTraceOrDebugEnabled(): boolean {
  // implements REQ-003
  return isCliTraceEnabled() || isCliDebugEnabled();
}

export function isPrologDebugEnabled(): boolean {
  // implements REQ-003
  return Boolean(getEnvValue("KIBI_PROLOG_DEBUG"));
}
