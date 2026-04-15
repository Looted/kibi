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
  const value = process.env[key];
  return typeof value === "string" ? value : undefined;
}

function getTrimmedEnvValue(key: string): string | undefined {
  const value = getEnvValue(key)?.trim();
  return value ? value : undefined;
}

export function getBranchOverride(): string | undefined {
  // implements REQ-003
  return getTrimmedEnvValue("KIBI_BRANCH");
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
