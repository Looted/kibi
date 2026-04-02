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
import {
  getSessionTracker,
  resetSessionTracker,
} from "../src/session-tracker.js";

describe("getSessionTracker", () => {
  test("returns a session tracker object", () => {
    const tracker = getSessionTracker();
    expect(tracker).toBeDefined();
    expect(typeof tracker).toBe("object");
  });

  test("returns same instance on multiple calls", () => {
    const tracker1 = getSessionTracker();
    const tracker2 = getSessionTracker();
    expect(tracker1).toBe(tracker2);
  });

  test("tracker has required methods", () => {
    const tracker = getSessionTracker();
    expect(typeof tracker.recordWarning).toBe("function");
    expect(typeof tracker.generateSummary).toBe("function");
  });
});

describe("resetSessionTracker", () => {
  test("resets the tracker to a new instance", () => {
    const tracker1 = getSessionTracker();
    resetSessionTracker();
    const tracker2 = getSessionTracker();
    expect(tracker1).not.toBe(tracker2);
  });

  test("new tracker is functional after reset", () => {
    resetSessionTracker();
    const tracker = getSessionTracker();
    expect(tracker).toBeDefined();
    expect(typeof tracker.recordWarning).toBe("function");
  });
});
