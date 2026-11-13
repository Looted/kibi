import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  MAX_ASPECT_CHARS,
  MAX_ASPECT_WORDS,
  SubjectKeyRegistry,
  type SubjectKeyResolution,
  claimFor,
  normalizeClaimStatement,
  planSubjectKey,
  resolveBootstrapSubjectKey,
  shareSubjectFacts,
  shortenSubjectAspect,
} from "../../../src/operations/bootstrap/requirement-claims.js";
import type { Candidate } from "../../../src/operations/bootstrap/types.js";

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex").slice(0, 6);

const NORMALIZED: [string, string][] = [
  ["- Invoices must be sent.", "Invoices must be sent."],
  ["* x", "x"],
  ["+ x", "x"],
  ["12. item", "item"],
  ["3) item", "item"],
  ["-x", "-x"],
  ["1.x", "1.x"],
  [" [ ] todo", "todo"],
  ["[x] done", "done"],
  ["[X] done", "done"],
  ["- [ ] both", "both"],
  ["[ ]tight", "tight"],
  ["  -   spaced  ", "spaced"],
  ["Note - x", "Note - x"],
  ["Note [x] y", "Note [x] y"],
  ["[y] z", "[y] z"],
  ["a 1. b", "a 1. b"],
  ["[x]", ""],
  ["  plain  ", "plain"],
];

describe("normalizeClaimStatement", () => {
  test.each(NORMALIZED)("%j reads as %j", (statement, expected) => {
    expect(normalizeClaimStatement(statement)).toBe(expected);
  });
});

type Reading = [string, string, string, string | number | boolean] | null;
const CLAIMS: [string, Reading][] = [
  [
    "Invoices must be retained for 7 years.",
    ["Invoices", "Retention Years", "eq", 7],
  ],
  [
    "The audit log shall be retained for 30 days",
    ["audit log", "Retention Days", "eq", 30],
  ],
  [
    "An export should be retained for 1 month.",
    ["export", "Retention Months", "eq", 1],
  ],
  [
    "a report must be retained for 2 months",
    ["report", "Retention Months", "eq", 2],
  ],
  [
    "Logs  must  be  retained  for  1  day",
    ["Logs", "Retention Days", "eq", 1],
  ],
  [
    "Logs must be retained for 3 weeks.",
    ["Logs", "be retained for 3 weeks", "polarity", "require"],
  ],
  ["Note\nLogs must be retained for 3 days.", null],
  [
    "Logs must be retained for 3 days. trailing words",
    ["Logs", "be retained for 3 days. trailing words", "polarity", "require"],
  ],
  ["Logs must be retained for 3 YEARS.", ["Logs", "Retention Years", "eq", 3]],
  [
    "Thelogs must be retained for 3 days.",
    ["Thelogs", "Retention Days", "eq", 3],
  ],
  [
    "the  logs must be retained for 3 days.",
    ["logs", "Retention Days", "eq", 3],
  ],
  [
    "Logs must be retained for x days.",
    ["Logs", "be retained for x days", "polarity", "require"],
  ],
  ["Logs must be retained for 3 year", ["Logs", "Retention Years", "eq", 3]],
  ["Sync must be enabled.", ["Sync", "enabled", "bool", true]],
  ["Sync shall be DISABLED", ["Sync", "enabled", "bool", false]],
  ["Sync  should  be  enabled", ["Sync", "enabled", "bool", true]],
  ["Note\nSync must be enabled.", null],
  [
    "Sync must be enabled. trailing words",
    ["Sync", "be enabled. trailing words", "polarity", "require"],
  ],
  ["Sync must be enabledx", ["Sync", "be enabledx", "polarity", "require"]],
  ["must be enabled.", ["System", "enabled", "bool", true]],
  ["Shall send mail.", ["System", "send mail", "polarity", "require"]],
  ["should  send mail.", ["System", "send mail", "polarity", "require"]],
  ["Mustard is yellow.", null],
  [
    "The service must send mail.",
    ["The service", "send mail", "polarity", "require"],
  ],
  [
    "The service must not send mail.",
    ["The service", "send mail", "polarity", "forbid"],
  ],
  [
    "The service must  not  send mail.",
    ["The service", "send mail", "polarity", "forbid"],
  ],
  [
    "The service must notify users.",
    ["The service", "notify users", "polarity", "require"],
  ],
  ["The service must not", ["The service", "not", "polarity", "require"]],
  ["The service must run .", ["The service", "run", "polarity", "require"]],
  ["The service must run  ", ["The service", "run", "polarity", "require"]],
  ["Service  shall  run.", ["Service", "run", "polarity", "require"]],
  ["Service should run..", ["Service", "run.", "polarity", "require"]],
  ["Is the service up?", null],
  ["- Is it up? ", null],
  ["- [ ] Service must run.", ["Service", "run", "polarity", "require"]],
  ["Nothing modal here.", null],
  ["Note\nService must run.", null],
  ["Service MUST run.", ["Service", "run", "polarity", "require"]],
  ["Service mustrun.", null],
  ["Logs must be kept?", null],
  ["Must the service run?", null],
  ["? Service must run.", ["? Service", "run", "polarity", "require"]],
  ["Data must be retained for 3 days.", ["Data", "Retention Days", "eq", 3]],
  [
    "Billing a log must be retained for 3 days.",
    ["Billing a log", "Retention Days", "eq", 3],
  ],
  ["-  Service must run.", ["Service", "run", "polarity", "require"]],
  [
    "Service must not  send mail.",
    ["Service", "send mail", "polarity", "forbid"],
  ],
];

describe("claimFor", () => {
  test.each(CLAIMS)("%j is modeled as %j", (statement, expected) => {
    const claim = claimFor(statement, "src", 0.5, "prov");
    expect(
      claim === null
        ? null
        : [claim.subjectKey, claim.propertyKey, claim.operator, claim.value],
    ).toStrictEqual(expected);
  });

  test("a modeled claim carries its source, confidence and provenance", () => {
    expect(claimFor("Sync must be enabled.", "src", 0.5, "prov")).toStrictEqual(
      {
        source: "src",
        subjectKey: "Sync",
        propertyKey: "enabled",
        operator: "bool",
        value: true,
        confidence: 0.5,
        provenance: "prov",
      },
    );
    expect(
      claimFor("Logs must be retained for 3 days.", "s", 0.25, "p"),
    ).toStrictEqual({
      source: "s",
      subjectKey: "Logs",
      propertyKey: "Retention Days",
      operator: "eq",
      value: 3,
      confidence: 0.25,
      provenance: "p",
    });
    expect(claimFor("Service must run.", "s", 0.75, "p")).toStrictEqual({
      source: "s",
      subjectKey: "Service",
      propertyKey: "run",
      operator: "polarity",
      value: "require",
      confidence: 0.75,
      provenance: "p",
    });
  });
});

const ASPECTS: [string, string][] = [
  ["", ""],
  ["_", "_"],
  ["__", "__"],
  ["short", "short"],
  ["a_b_c_d", "a_b_c_d"],
  ["a_b_c_d_e", "b_c_d_e"],
  [
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  ],
  [
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  ],
  ["abc_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy", "abc"],
  ["send_invoice_email_when_payment_fails", "send_invoice_email"],
  ["the_send_invoice_email_when_payment_fails", "send_invoice_email"],
  ["when_send_invoice_email_now_please", "when_now_please"],
  ["the_when_send_mail_to_users_daily", "when_send_mail_users"],
  ["the_the_when_x_y_z_w", "when_z_w"],
  ["send_the_invoice_email_to_the_customer", "send_invoice_email_customer"],
  [
    "quickly_send_the_invoice_email_to_customer_daily",
    "send_invoice_email_customer",
  ],
  ["send_mail_to_users_and_admins", "send_mail_to_users"],
  ["send_mail_and_sms", "send_mail_and_sms"],
  ["and_send_mail_quickly_to_users_now", "and_users_now"],
  ["the_a_an_the_is", "the"],
  ["only_quickly_sly_ly_very_fly_rely", "sly_fly_rely"],
  ["ly_ly_ly_ly_ly", "ly"],
  ["reply_apply_supply_comply_fly", "fly"],
  ["really_quickly_badly_madly_sadly", "really"],
  ["first_second_third_fourth_fifth", "first_fourth_fifth"],
  ["alpha_beta_alpha_gamma_alpha", "alpha_gamma"],
  [
    "verylongwordnumberoneisherexxx_secondlongwordxxxxxxxxxx_thirdlongwordxxxxxxxxxxx_fourthxxxxxxxxxxxxxxxxxx_last",
    "verylongwordnumberoneisherexxx_last",
  ],
  [
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa_b_c_d_e",
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  ],
  [
    "a_bbbbbbbbbbbbbbbbbbbbbb_cccccccccccccccccccc_dddd_eeee",
    "bbbbbbbbbbbbbbbbbbbbbb_dddd_eeee",
  ],
  ["one_two_three_four_five_six_seven", "one_six_seven"],
  ["store_files_in_bucket_for_backups_and_restore", "store_files_in_bucket"],
  ["the_files_are_stored_in_bucket_for_long_term", "files_stored_bucket"],
  ["is_are_was_the_run_jobs_nightly_each_day_on_time_end", "run_time_end"],
  ["keep_logs_while_running", "keep_logs_while_running"],
  ["keep__logs_while_running_now_x", "keep_logs"],
  ["x_y_z_w_v_while_a", "x_w_v"],
  ["run_jobs_nightly_each_day_on_time_with_care", "run_time_care"],
  ["only_the_admin_users_can_delete_old_records", "admin_old_records"],
  ["delete_old_records_of_all_admin_users_daily_please", "delete_users_please"],
  [
    "the_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "the_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  ],
  ["alpha_of_beta_gamma_to_when_x", "alpha_of_beta_gamma"],
  [
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaly",
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  ],
  [
    "aaaaaaaaaaaa_mm_nn_bbbbbbbbbbbbb_ccccccccccccc",
    "aaaaaaaaaaaa_bbbbbbbbbbbbb_ccccccccccccc",
  ],
  ["the_when_alpha_beta", "the_when_alpha_beta"],
  ["alpha_when_beta_gamma_delta_epsilon", "alpha"],
  ["the_alpha_beta_gamma_delta", "alpha_beta_gamma_delta"],
  ["alpha_beta_gamma_delta_the_the", "alpha_beta_gamma_delta"],
];

describe("shortenSubjectAspect", () => {
  test("the limits", () => {
    expect([MAX_ASPECT_WORDS, MAX_ASPECT_CHARS]).toStrictEqual([4, 40]);
  });

  test.each(ASPECTS)("%j is shortened to %j", (aspect, expected) => {
    expect(shortenSubjectAspect(aspect)).toBe(expected);
  });
});

const BOUNDARY_WORDS = [
  "when",
  "whenever",
  "while",
  "if",
  "unless",
  "without",
  "after",
  "before",
  "until",
  "because",
  "once",
  "as",
  "by",
  "via",
  "during",
  "except",
  "so",
  "that",
  "which",
  "who",
  "where",
  "since",
  "for",
  "and",
  "or",
];
const STOP_WORDS = [
  "a",
  "an",
  "the",
  "be",
  "is",
  "are",
  "was",
  "were",
  "been",
  "being",
  "to",
  "of",
  "in",
  "on",
  "at",
  "with",
  "from",
  "into",
  "its",
  "it",
  "their",
  "they",
  "them",
  "this",
  "these",
  "those",
  "can",
  "could",
  "will",
  "would",
  "may",
  "might",
  "must",
  "shall",
  "should",
  "do",
  "does",
  "has",
  "have",
  "had",
  "any",
  "all",
  "each",
  "every",
  "some",
  "only",
  "also",
  "then",
  "than",
  "not",
  "no",
];

describe("aspect word lists", () => {
  test.each(BOUNDARY_WORDS)("%s ends the aspect", (word) => {
    expect(shortenSubjectAspect(`alpha_beta_gamma_delta_${word}_epsilon`)).toBe(
      "alpha_beta_gamma_delta",
    );
  });

  test.each(STOP_WORDS)("%s is trimmed from the aspect", (word) => {
    expect(shortenSubjectAspect(`${word}_alpha_beta_gamma_delta`)).toBe(
      "alpha_beta_gamma_delta",
    );
  });
});

const KEYS: [string, string, string | undefined, SubjectKeyResolution][] = [
  [
    "billing.invoice",
    "x",
    undefined,
    { ok: true, subjectKey: "billing.invoice" },
  ],
  [
    "Billing.Invoice",
    "x",
    undefined,
    { ok: true, subjectKey: "billing.invoice" },
  ],
  [
    "the billing.invoice",
    "x",
    undefined,
    { ok: true, subjectKey: "billing.invoice" },
  ],
  [
    "  The Billing",
    "Send Mail",
    undefined,
    { ok: true, subjectKey: "billing.send_mail" },
  ],
  ["An invoice", "send", undefined, { ok: true, subjectKey: "invoice.send" }],
  ["a", "send", undefined, { ok: true, subjectKey: "a.send" }],
  ["", "x", undefined, { ok: false, reason: 'subject "" has no usable words' }],
  [
    "!!!",
    "x",
    undefined,
    { ok: false, reason: 'subject "!!!" has no usable words' },
  ],
  ["the ", "x", undefined, { ok: true, subjectKey: "the.x" }],
  [
    "Invoice",
    "Send mail",
    undefined,
    { ok: true, subjectKey: "invoice.send_mail" },
  ],
  [
    "Invoice",
    "!!!",
    undefined,
    {
      ok: false,
      reason:
        'subject key "invoice" names no component, so it would violate component.aspect[.sub]',
    },
  ],
  [
    "9invoice",
    "send",
    undefined,
    {
      ok: false,
      reason:
        'subject key "9invoice" names no component, so it would violate component.aspect[.sub]',
    },
  ],
  [
    "invoice report",
    "send",
    undefined,
    {
      ok: false,
      reason:
        'subject key "invoice_report" names no component, so it would violate component.aspect[.sub]',
    },
  ],
  ["Invoice", "send", "Billing", { ok: true, subjectKey: "billing.invoice" }],
  ["Billing", "send", "Billing", { ok: true, subjectKey: "billing.send" }],
  [
    "billing invoice",
    "send",
    "Billing",
    { ok: true, subjectKey: "billing.invoice" },
  ],
  [
    "billing invoice",
    "send",
    " Billing  Ops ",
    { ok: true, subjectKey: "billing_ops.billing_invoice" },
  ],
  ["invoice", "send", "!!!", { ok: true, subjectKey: "invoice.send" }],
  ["billing", "send", "", { ok: true, subjectKey: "billing.send" }],
  ["invoice", "", "billing", { ok: true, subjectKey: "billing.invoice" }],
  [
    "billing",
    "",
    "billing",
    {
      ok: false,
      reason: 'subject key "billing." does not follow component.aspect[.sub]',
    },
  ],
  [
    "billing",
    "!!",
    "billing",
    {
      ok: false,
      reason: 'subject key "billing." does not follow component.aspect[.sub]',
    },
  ],
  [
    "invoice",
    "send",
    "9lives",
    {
      ok: false,
      reason:
        'subject key "9lives.invoice" does not follow component.aspect[.sub]',
    },
  ],
  [
    "invoice/report",
    "send",
    undefined,
    { ok: true, subjectKey: "invoice.report" },
  ],
  ["a.b", "x", undefined, { ok: true, subjectKey: "a.b" }],
  [
    "x_y",
    "z",
    undefined,
    {
      ok: false,
      reason:
        'subject key "x_y" names no component, so it would violate component.aspect[.sub]',
    },
  ],
  [
    "the invoice",
    "send the invoice email when payment fails today",
    "billing",
    { ok: true, subjectKey: "billing.invoice" },
  ],
  [
    "send the invoice email when payment fails today",
    "x",
    "billing",
    {
      ok: true,
      subjectKey: "billing.send_the_invoice_email",
      shortenedFrom: "billing.send_the_invoice_email_when_payment_fails_today",
    },
  ],
  [
    "billing send the invoice email when payment fails",
    "x",
    "billing",
    {
      ok: true,
      subjectKey: "billing.send_the_invoice_email",
      shortenedFrom: "billing.send_the_invoice_email_when_payment_fails",
    },
  ],
  [
    "Invoice",
    "send the invoice email when payment fails today",
    undefined,
    {
      ok: true,
      subjectKey: "invoice.send_the_invoice_email",
      shortenedFrom: "invoice.send_the_invoice_email_when_payment_fails_today",
    },
  ],
  [
    "Invoice",
    "Send-Mail",
    undefined,
    { ok: true, subjectKey: "invoice.send_mail" },
  ],
  ["Thebilling", "x", undefined, { ok: true, subjectKey: "thebilling.x" }],
  ["Invoice", "x", "_billing_", { ok: true, subjectKey: "billing.invoice" }],
  ["the  invoice", "send", undefined, { ok: true, subjectKey: "invoice.send" }],
  [
    "ATHE invoice",
    "s",
    undefined,
    {
      ok: false,
      reason:
        'subject key "athe_invoice" names no component, so it would violate component.aspect[.sub]',
    },
  ],
  ["billing_x", "y", "billing", { ok: true, subjectKey: "billing.x" }],
  ["billingx", "y", "billing", { ok: true, subjectKey: "billing.billingx" }],
  ["invoice", "send", "a__b", { ok: true, subjectKey: "a_b.invoice" }],
  ["invoice", "a__b", undefined, { ok: true, subjectKey: "invoice.a_b" }],
  ["invoice", "_send_", undefined, { ok: true, subjectKey: "invoice.send" }],
  ["invoice.", "send", undefined, { ok: true, subjectKey: "invoice.send" }],
  ["invoice", "send", "-", { ok: true, subjectKey: "invoice.send" }],
  ["x_y.9z", "send", "billing", { ok: true, subjectKey: "billing.x_y_9z" }],
  ["the\tinvoice", "send", undefined, { ok: true, subjectKey: "invoice.send" }],
];

describe("resolveBootstrapSubjectKey", () => {
  test.each(KEYS)(
    "%j / %j / %j resolves to %j",
    (subject, property, component, expected) => {
      expect(
        component === undefined
          ? resolveBootstrapSubjectKey(subject, property)
          : resolveBootstrapSubjectKey(subject, property, component),
      ).toStrictEqual(expected);
    },
  );
});

describe("SubjectKeyRegistry", () => {
  test("the first claim keeps its key and a repeat gets the same key", () => {
    const registry = new SubjectKeyRegistry();
    expect(registry.assign({ subjectKey: "a.b" })).toStrictEqual({
      subjectKey: "a.b",
    });
    expect(registry.assign({ subjectKey: "a.b" })).toStrictEqual({
      subjectKey: "a.b",
    });
    const long = { subjectKey: "a.c", shortenedFrom: "a.c_long" };
    expect(registry.assign(long)).toStrictEqual({ subjectKey: "a.c" });
    expect(registry.assign(long)).toStrictEqual({ subjectKey: "a.c" });
  });

  test("a different subject on a taken key gets a qualifier from its wording", () => {
    const registry = new SubjectKeyRegistry();
    registry.assign({ subjectKey: "a.b_c" });
    const first = { subjectKey: "a.b_c", shortenedFrom: "a.b_the_and_c_long" };
    expect(registry.assign(first)).toStrictEqual({
      subjectKey: "a.b_c.long",
      collidedWith: "a.b_c",
    });
    expect(registry.assign(first)).toStrictEqual({ subjectKey: "a.b_c.long" });
    // "long" is taken under a.b_c now, so the next word is used.
    expect(
      registry.assign({ subjectKey: "a.b_c", shortenedFrom: "a.c_long_x" }),
    ).toStrictEqual({ subjectKey: "a.b_c.x", collidedWith: "a.b_c" });
  });

  test("with no usable word the qualifier is a digest", () => {
    const registry = new SubjectKeyRegistry();
    registry.assign({ subjectKey: "a.b" });
    for (const shortenedFrom of [
      "zeta.b_the_and_9z",
      "a.b_alpha-beta",
      "a.b__",
    ])
      expect(
        registry.assign({ subjectKey: "a.b", shortenedFrom }),
      ).toStrictEqual({
        subjectKey: `a.b.k${digest(shortenedFrom)}`,
        collidedWith: "a.b",
      });
  });

  test("a qualified key is owned by its subject", () => {
    const registry = new SubjectKeyRegistry();
    registry.assign({ subjectKey: "a.b" });
    registry.assign({ subjectKey: "a.b", shortenedFrom: "a.b_long" });
    expect(registry.assign({ subjectKey: "a.b.long" })).toStrictEqual({
      subjectKey: `a.b.long.k${digest("a.b.long")}`,
      collidedWith: "a.b.long",
    });
  });
});

describe("planSubjectKey", () => {
  const LONG = "send the invoice email when payment fails today";

  test("an unresolved subject has no diagnostics", () => {
    expect(
      planSubjectKey("!!!", "x", undefined, undefined, "s:1"),
    ).toStrictEqual({
      resolution: { ok: false, reason: 'subject "!!!" has no usable words' },
      diagnostics: [],
    });
  });

  test("a key that fits is used as it is", () => {
    expect(
      planSubjectKey(
        "Invoice",
        "send",
        "billing",
        new SubjectKeyRegistry(),
        "s:1",
      ),
    ).toStrictEqual({
      resolution: { ok: true, subjectKey: "billing.invoice" },
      diagnostics: [],
    });
  });

  test("a shortened key is reported, without a registry too", () => {
    const full = "billing.send_the_invoice_email_when_payment_fails_today";
    expect(
      planSubjectKey(LONG, "x", "billing", undefined, "s:1"),
    ).toStrictEqual({
      resolution: {
        ok: true,
        subjectKey: "billing.send_the_invoice_email",
        shortenedFrom: full,
      },
      diagnostics: [
        `subject-key-shortened: claim at s:1 would have the subject key ${full}; its aspect is longer than 4 words or 40 characters, so the plan uses billing.send_the_invoice_email. Rename the subject after apply if another noun phrase fits better.`,
      ],
    });
  });

  test("a collision is disambiguated and reported", () => {
    const registry = new SubjectKeyRegistry();
    planSubjectKey("send the invoice email", "x", "billing", registry, "s:1");
    const planned = planSubjectKey(LONG, "x", "billing", registry, "s:2");
    expect(planned.resolution).toStrictEqual({
      ok: true,
      subjectKey: "billing.send_the_invoice_email.payment",
      shortenedFrom: "billing.send_the_invoice_email_when_payment_fails_today",
    });
    expect(planned.diagnostics[1]).toBe(
      "subject-key-disambiguated: claim at s:2 names a different subject than an earlier claim keyed billing.send_the_invoice_email, so the plan uses billing.send_the_invoice_email.payment instead of reusing that key.",
    );
    expect(planned.diagnostics).toHaveLength(2);
    expect(planned.diagnostics[0]).toContain(
      "so the plan uses billing.send_the_invoice_email.payment.",
    );
  });
});

const subject = (
  id: unknown,
  key: unknown,
  extra: Record<string, unknown> = {},
) => ({
  id,
  type: "fact",
  properties: { fact_kind: "subject", subject_key: key, ...extra },
});

const candidate = (
  candidateId: string,
  sourcePath: string,
  applyPlan: Record<string, unknown>[],
  relationships: Candidate["relationships"] = [],
): Candidate => ({
  candidateId,
  entityType: "req",
  title: candidateId,
  sourceKind: "markdown",
  sourcePath,
  confidence: 1,
  confidenceBand: "high",
  evidence: [],
  relationships,
  applyPlan,
});

describe("shareSubjectFacts", () => {
  test("keeps the first subject fact for a shared key and retargets later links", () => {
    const first = candidate("C1", "docs/a.md", [
      subject("FACT-a", "user.session", { tags: ["kept"] }),
      {
        id: "REQ-a",
        type: "req",
        relationships: [{ type: "constrains", to: "FACT-a" }],
      },
      { id: "FACT-other", type: "fact", properties: null },
      {
        id: "FACT-a2",
        type: "req",
        properties: { fact_kind: "subject", subject_key: "user.session" },
      },
      {
        id: "FACT-a3",
        type: "fact",
        properties: { fact_kind: "domain", subject_key: "user.session" },
      },
      {
        id: "FACT-a4",
        type: "fact",
        properties: { fact_kind: "subject", subject_key: 7 },
      },
      {
        id: 9,
        type: "fact",
        properties: { fact_kind: "subject", subject_key: "user.session" },
      },
    ]);
    const second = candidate(
      "C2",
      "docs/b.md",
      [
        subject("FACT-b", "user.session"),
        {
          id: "REQ-b",
          type: "req",
          relationships: [
            { type: "constrains", to: "FACT-b" },
            { type: "relates_to", to: "REQ-a" },
          ],
        },
      ],
      [
        { type: "constrains", from: "REQ-b", to: "FACT-b" },
        { type: "relates_to", from: "REQ-b", to: "REQ-a" },
      ],
    );
    const third = candidate("C3", "docs/c.md", [
      subject("FACT-c", "user.session", { text_ref: "docs/b.md" }),
      subject("FACT-a", "user.session"),
      subject("FACT-solo", "billing.plan", { tags: "none" }),
      { id: "FACT-a", type: "req", relationships: "none" },
    ]);
    const { candidates, diagnostics } = shareSubjectFacts([
      first,
      second,
      third,
    ]);
    expect(diagnostics).toStrictEqual([
      "subject-key-shared: claims at docs/a.md, docs/b.md name the same subject user.session, so the plan writes one subject fact FACT-a and links every requirement to it through constrains.",
    ]);
    expect(candidates[0]?.applyPlan[0]).toStrictEqual({
      id: "FACT-a",
      type: "fact",
      properties: {
        fact_kind: "subject",
        subject_key: "user.session",
        tags: ["kept", "provenance:docs-a-md", "provenance:docs-b-md"],
      },
      document: {
        body: "Definition not stated: the subject user.session is named by the requirements bootstrap planned from docs/a.md, docs/b.md, each of which links to this fact through constrains. The people who own that source can say what it is in the product and what it is not.\n",
      },
    });
    expect(candidates[0]?.applyPlan.slice(1)).toStrictEqual(
      first.applyPlan.slice(1),
    );
    expect(candidates[1]).toStrictEqual({
      ...second,
      relationships: [
        { type: "constrains", from: "REQ-b", to: "FACT-a" },
        { type: "relates_to", from: "REQ-b", to: "REQ-a" },
      ],
      applyPlan: [
        {
          id: "REQ-b",
          type: "req",
          relationships: [
            { type: "constrains", to: "FACT-a" },
            { type: "relates_to", to: "REQ-a" },
          ],
        },
      ],
    });
    expect(candidates[2]?.applyPlan.map((step) => step.id)).toStrictEqual([
      "FACT-a",
      "FACT-solo",
      "FACT-a",
    ]);
    expect(
      (candidates[2]?.applyPlan[0]?.properties as Record<string, unknown>).tags,
    ).toStrictEqual(["provenance:docs-a-md", "provenance:docs-b-md"]);
    expect(candidates[2]?.applyPlan[1]).toStrictEqual(third.applyPlan[2]);
    expect(candidates[2]?.applyPlan[2]).toStrictEqual(third.applyPlan[3]);
  });

  test("a step with a numeric id is not a subject fact, and a missing text_ref falls back to the path", () => {
    const { candidates, diagnostics } = shareSubjectFacts([
      candidate("C1", "a.md", [subject("1", "k.x")]),
      candidate("C2", "b.md", [subject("2", "k.x", { text_ref: "a.md" })]),
      candidate("C3", "c.md", [subject("3", "k.x")]),
      candidate("C4", "d.md", [subject(4, "k.x")]),
    ]);
    expect(diagnostics).toStrictEqual([
      "subject-key-shared: claims at a.md, c.md name the same subject k.x, so the plan writes one subject fact 1 and links every requirement to it through constrains.",
    ]);
    expect(candidates.map((c) => c.applyPlan.length)).toStrictEqual([
      1, 0, 0, 1,
    ]);
  });

  test("a subject key that is not text is not shared", () => {
    const plans = [
      candidate("C1", "a.md", [subject("F1", 7)]),
      candidate("C2", "b.md", [subject("F2", 7)]),
    ];
    expect(shareSubjectFacts(plans).candidates).toStrictEqual(plans);
  });

  test("a renamed fact whose owner gains no new source is not reported", () => {
    const { candidates, diagnostics } = shareSubjectFacts([
      candidate("C1", "a.md", [subject("F1", "k.x")]),
      candidate("C2", "a.md", [subject("F2", "k.x")]),
    ]);
    expect(diagnostics).toStrictEqual([]);
    expect(candidates[0]?.applyPlan).toStrictEqual([subject("F1", "k.x")]);
    expect(candidates[1]?.applyPlan).toStrictEqual([]);
  });

  test("leaves a plan without shared keys as it is", () => {
    const only = candidate("C1", "docs/a.md", [subject("FACT-a", "k")]);
    const result = shareSubjectFacts([only]);
    expect(result).toStrictEqual({ candidates: [only], diagnostics: [] });
    expect(result.candidates[0]).toBe(only);
  });
});
