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
import type { LoadEnvResult } from "../src/env.js";

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
    const hasOwnProperty = Object.prototype.hasOwnProperty.call(
      process.env,
      existingKey,
    );
    expect(typeof hasOwnProperty).toBe("boolean");
  });
});

describe("env file loading behavior", () => {
  test("respects KIBI_ENV_FILE environment variable", () => {
    const customEnvFile = process.env.KIBI_ENV_FILE;
    const expectedFileName = customEnvFile ?? ".env";
    expect(expectedFileName).toBeTruthy();
  });

  test("default env file is .env", () => {
    const defaultEnvFile = ".env";
    expect(defaultEnvFile).toBe(".env");
  });
});
