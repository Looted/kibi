/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { describe, expect, test } from "bun:test";
import { DEFAULTS, loadConfig } from "../src/config.js";

describe("DEFAULTS", () => {
  test("has expected default values", () => {
    expect(DEFAULTS).toHaveProperty("enabled");
    expect(DEFAULTS).toHaveProperty("prompt");
    expect(DEFAULTS).toHaveProperty("sync");
    expect(DEFAULTS).toHaveProperty("guidance");
  });

  test("enabled is true by default", () => {
    expect(DEFAULTS.enabled).toBe(true);
  });

  test("prompt.enabled is true by default", () => {
    expect(DEFAULTS.prompt.enabled).toBe(true);
  });

  test("sync.enabled is true by default", () => {
    expect(DEFAULTS.sync.enabled).toBe(true);
  });

  test("has default debounce value", () => {
    expect(typeof DEFAULTS.sync.debounceMs).toBe("number");
    expect(DEFAULTS.sync.debounceMs).toBeGreaterThan(0);
  });

  test("has guidance defaults", () => {
    expect(DEFAULTS.guidance.dynamic).toBe(true);
    expect(DEFAULTS.guidance.warnOnKbEdits).toBe(true);
  });

  test("has comment detection defaults", () => {
    expect(DEFAULTS.guidance.commentDetection.enabled).toBe(true);
    expect(typeof DEFAULTS.guidance.commentDetection.minLines).toBe("number");
  });
});

  test("has ux.briefs.autoSubmit default", () => {
    expect(DEFAULTS.ux.briefs?.autoSubmit).toBe(true);
  });

describe("loadConfig", () => {
  test("returns defaults when no config files exist", async () => {
    const config = await loadConfig("/nonexistent/path");
    expect(config.enabled).toBe(DEFAULTS.enabled);
    expect(config.prompt.enabled).toBe(DEFAULTS.prompt.enabled);
  });

  test("handles empty config object", async () => {
    const config = await loadConfig("/nonexistent");
    expect(typeof config).toBe("object");
    expect(config).not.toBeNull();
  });

  test("validates hookMode values", async () => {
    const config = await loadConfig("/nonexistent");
    const validHookModes = [
      "auto",
      "chat-params",
      "system-transform",
      "compat",
    ];
    if (config.prompt.hookMode) {
      expect(validHookModes).toContain(config.prompt.hookMode);
    }
  });

  test("has logLevel default", async () => {
    const config = await loadConfig("/nonexistent");
    expect(config).toHaveProperty("logLevel");
    expect(["debug", "info", "warn", "error"]).toContain(config.logLevel);
  });
});
