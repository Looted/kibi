import { describe, expect, test } from "bun:test";
import {
  bindingLookup,
  convertJUnitXml,
} from "../../src/proof/producers/junit-adapter.js";

const bindings = [
  {
    symbol_id: "SYM-LOGIN",
    target: "default",
    native_id: "LoginTest::acceptsValidPassword",
    aliases: ["acceptsValidPassword"],
  },
  {
    symbol_id: "SYM-RETRY",
    target: "default",
    native_id: "RetryTest::flakyUntilPass",
  },
];

describe("bindingLookup", () => {
  test("resolves native ids and aliases", () => {
    const lookup = bindingLookup(bindings);
    expect(lookup("LoginTest::acceptsValidPassword")).toEqual({
      symbol_id: "SYM-LOGIN",
      target: "default",
    });
    expect(lookup("acceptsValidPassword")).toEqual({
      symbol_id: "SYM-LOGIN",
      target: "default",
    });
    expect(lookup("missing")).toBeNull();
  });
});

describe("convertJUnitXml", () => {
  test("maps passing, failing, skipped, and retried cases", () => {
    const xml = `
      <testsuite name="suite">
        <testcase name="acceptsValidPassword" classname="LoginTest" time="0.012"/>
        <testcase name="rejectsBlank" classname="LoginTest" time="0.2">
          <failure message="blank">expected reject</failure>
        </testcase>
        <testcase name="pendingWizard" classname="LoginTest">
          <skipped></skipped>
        </testcase>
        <testcase name="flakyUntilPass" classname="RetryTest" time="1.5">
          <rerunFailure message="once"></rerunFailure>
          <rerunError message="twice"></rerunError>
        </testcase>
      </testsuite>
    `;
    const converted = convertJUnitXml(xml, bindings);
    expect(converted.diagnostics).toEqual([
      "unbound junit testcase ignored: LoginTest::rejectsBlank",
      "unbound junit testcase ignored: LoginTest::pendingWizard",
    ]);
    expect(converted.results).toHaveLength(2);
    expect(converted.results[0]).toMatchObject({
      symbol_id: "SYM-LOGIN",
      outcome: "passed",
      native_id: "LoginTest::acceptsValidPassword",
      attempts: { status: "unavailable" },
    });
    expect(converted.results[1]?.outcome).toBe("passed");
    expect(converted.results[1]?.attempts).toEqual({
      status: "complete",
      entries: [
        { outcome: "failed" },
        { outcome: "failed" },
        { outcome: "passed", duration_ms: 1500 },
      ],
    });
  });

  test("treats skipped-plus-failure as failed and ignores nameless cases", () => {
    const xml = `
      <testsuite>
        <testcase classname="OnlyClass"/>
        <testcase name="broken" classname="LoginTest">
          <skipped></skipped>
          <error>boom</error>
        </testcase>
        <testcase name='acceptsValidPassword' classname='LoginTest' time='not-a-number'></testcase>
      </testsuite>
    `;
    const converted = convertJUnitXml(xml, [
      {
        symbol_id: "SYM-BROKEN",
        target: "ci",
        native_id: "LoginTest::broken",
      },
      {
        symbol_id: "SYM-LOGIN",
        target: "default",
        native_id: "LoginTest::acceptsValidPassword",
      },
    ]);
    expect(converted.results).toEqual([
      expect.objectContaining({
        symbol_id: "SYM-BROKEN",
        outcome: "failed",
        attempts: { status: "unavailable" },
      }),
      expect.objectContaining({
        symbol_id: "SYM-LOGIN",
        outcome: "passed",
        attempts: { status: "unavailable" },
      }),
    ]);
  });

  test("ignores duplicate bound results", () => {
    const xml = `
      <testsuite>
        <testcase name="acceptsValidPassword" classname="LoginTest"/>
        <testcase name="acceptsValidPassword" classname="LoginTest"/>
      </testsuite>
    `;
    const converted = convertJUnitXml(xml, bindings);
    expect(converted.results).toHaveLength(1);
    expect(converted.diagnostics).toContain(
      "duplicate junit result for LoginTest::acceptsValidPassword; ignored",
    );
  });

  test("reports missing testsuites when nothing bound", () => {
    const converted = convertJUnitXml("not a report", []);
    expect(converted.results).toEqual([]);
    expect(converted.diagnostics).toContain(
      "no <testsuite> element found; not a JUnit XML report",
    );
  });

  test("uses the case name alone when classname is absent", () => {
    const converted = convertJUnitXml(
      `<testsuite><testcase name="acceptsValidPassword"/></testsuite>`,
      bindings,
    );
    expect(converted.results[0]?.native_id).toBe("acceptsValidPassword");
    expect(converted.results[0]?.symbol_id).toBe("SYM-LOGIN");
  });
});
