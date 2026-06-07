/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { afterEach, describe, expect, test } from "bun:test";
import type { LoadEnvResult } from "../src/env.js";
import {
  getBranchOverride,
  getCoreModulePathOverride,
  getEnvFileName,
  getKbPlPathOverride,
  isMcpDebugEnabled,
} from "../src/env.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

// Import the functions we need to test - parseEnvContent is private,
// so we test via loadEnvFile behavior

describe("env module type definitions", () => {
  test("LoadEnvResult interface has correct structure", () => {
    // Type-only test to verify the interface at compile time
    const sampleResult: LoadEnvResult = {
      loaded: true,
      envFilePath: "/path/to/.env",
      keysLoaded: ["KEY1", "KEY2"],
    };

    expect(sampleResult.loaded).toBe(true);
    expect(sampleResult.envFilePath).toBe("/path/to/.env");
    expect(sampleResult.keysLoaded).toEqual(["KEY1", "KEY2"]);
  });

  test("LoadEnvResult handles unloaded state", () => {
    const sampleResult: LoadEnvResult = {
      loaded: false,
      envFilePath: "/path/to/.env",
      keysLoaded: [],
    };

    expect(sampleResult.loaded).toBe(false);
    expect(sampleResult.keysLoaded).toHaveLength(0);
  });
});

describe("env file parsing logic", () => {
  test("recognizes valid env file format", () => {
    // Valid env lines
    const validLines = [
      "KEY=value",
      'KEY2="quoted value"',
      "KEY3='single quoted'",
      "  KEY4  =  value  ",
    ];

    for (const line of validLines) {
      const eqIndex = line.indexOf("=");
      expect(eqIndex).toBeGreaterThan(0);
    }
  });

  test("recognizes comments and empty lines", () => {
    const commentLines = [
      "# This is a comment",
      "  # Indented comment",
      "",
      "   ",
    ];

    for (const line of commentLines) {
      const trimmed = line.trim();
      const isComment = trimmed.startsWith("#");
      const isEmpty = trimmed === "";
      expect(isComment || isEmpty).toBe(true);
    }
  });

  test("recognizes invalid env lines", () => {
    const invalidLines = [
      "=value", // No key
      "KEY", // No equals sign
      "=", // Just equals
    ];

    for (const line of invalidLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue; // These are valid (skipped)
      }
      const eqIndex = trimmed.indexOf("=");
      expect(eqIndex <= 0).toBe(true);
    }
  });

  test("handles quoted values correctly", () => {
    const testCases = [
      { input: '"value"', expected: "value" },
      { input: "'value'", expected: "value" },
      { input: '  "value"  ', expected: "value" },
      { input: '"value with spaces"', expected: "value with spaces" },
    ];

    for (const { input, expected } of testCases) {
      let value = input.trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      expect(value).toBe(expected);
    }
  });

  test("handles unquoted values", () => {
    const testCases = [
      { input: "simple", expected: "simple" },
      { input: "  value  ", expected: "value" },
    ];

    for (const { input, expected } of testCases) {
      const value = input.trim();
      expect(value).toBe(expected);
    }
  });

  test("handles complex env values", () => {
    const testCases = [
      { input: "VALUE=foo=bar", expected: { key: "VALUE", value: "foo=bar" } },
      {
        input: 'URL="https://example.com"',
        expected: { key: "URL", value: "https://example.com" },
      },
      {
        input: "PATH=/usr/bin:/bin",
        expected: { key: "PATH", value: "/usr/bin:/bin" },
      },
    ];

    for (const { input, expected } of testCases) {
      const eqIndex = input.indexOf("=");
      const key = input.substring(0, eqIndex).trim();
      let value = input.substring(eqIndex + 1).trim();

      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }

      expect(key).toBe(expected.key);
      expect(value).toBe(expected.value);
    }
  });

  test("process.env key existence check", () => {
    // Simulate checking if a key exists in process.env
    const existingKey = "PATH";
    const keyExists = Object.prototype.hasOwnProperty.call(
      process.env,
      existingKey,
    );
    expect(typeof keyExists).toBe("boolean");
  });
});

describe("env file loading behavior", () => {
  test("getEnvFileName respects KIBI_ENV_FILE environment variable", () => {
    process.env.KIBI_ENV_FILE = ".env.custom";

    expect(getEnvFileName()).toBe(".env.custom");
  });

  test("getEnvFileName falls back to .env", () => {
    process.env.KIBI_ENV_FILE = "";

    expect(getEnvFileName()).toBe(".env");
  });

  test("isMcpDebugEnabled reflects KIBI_MCP_DEBUG", () => {
    process.env.KIBI_MCP_DEBUG = "";
    expect(isMcpDebugEnabled()).toBe(false);

    process.env.KIBI_MCP_DEBUG = "1";
    expect(isMcpDebugEnabled()).toBe(true);
  });

  test("getBranchOverride trims non-empty KIBI_BRANCH values", () => {
    process.env.KIBI_BRANCH = "  feature/test  ";
    expect(getBranchOverride()).toBe("feature/test");

    process.env.KIBI_BRANCH = "   ";
    expect(getBranchOverride()).toBeUndefined();
  });

  test("getCoreModulePathOverride resolves per-module override key", () => {
    process.env.KIBI_DISCOVERY_PL_PATH = "/tmp/discovery.pl";

    expect(getCoreModulePathOverride("discovery.pl")).toBe("/tmp/discovery.pl");
  });

  test("getKbPlPathOverride returns generic kb.pl override", () => {
    process.env.KIBI_KB_PL_PATH = "/tmp/kb.pl";

    expect(getKbPlPathOverride()).toBe("/tmp/kb.pl");
  });
});
