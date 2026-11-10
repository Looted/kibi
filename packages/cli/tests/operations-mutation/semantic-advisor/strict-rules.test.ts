import { describe, expect, test } from "bun:test";
import { strictSuggestion } from "../../../src/operations/semantic-advisor/shared.js";
import {
  detectSourceShape,
  detectStrictSuggestion,
} from "../../../src/operations/semantic-advisor/strict-rules.js";

/** The confidence, evidence, claim and rationale opening of a reading. */
function reading(statement: string): string {
  const found = detectStrictSuggestion({}, statement);
  if (found === null) return "null";
  if (found.kind !== "strict_property") return found.kind;
  return `${found.confidence} | ${found.evidence} | ${JSON.stringify(found.claim)} | ${found.rationale.slice(0, 32)}`;
}

const READINGS: ReadonlyArray<readonly [string, string]> = [
  [
    "Session tokens expire after 30 days.",
    '0.88 | expire after 30 days | {"subject_key":"session.token","property_key":"expiry_days","operator":"eq","value_type":"int","value_int":30,"unit":"days"} | Expiry duration is a scalar stri',
  ],
  [
    "Session  tokens  expire  after  30  days",
    '0.88 | expire after 30 days | {"subject_key":"session.token","property_key":"expiry_days","operator":"eq","value_type":"int","value_int":30,"unit":"days"} | Expiry duration is a scalar stri',
  ],
  ["Session tokens expire after 30 days trailing words", "null"],
  [
    "Note: Session tokens expire after 30 days.",
    '0.88 | expire after 30 days | {"subject_key":"note.session.token","property_key":"expiry_days","operator":"eq","value_type":"int","value_int":30,"unit":"days"} | Expiry duration is a scalar stri',
  ],
  [
    "Session tokens expires after 1 day",
    '0.88 | expire after 1 day | {"subject_key":"session.token","property_key":"expiry_days","operator":"eq","value_type":"int","value_int":1,"unit":"days"} | Expiry duration is a scalar stri',
  ],
  [
    "Session  tokens  expires  after  1  day",
    '0.88 | expire after 1 day | {"subject_key":"session.token","property_key":"expiry_days","operator":"eq","value_type":"int","value_int":1,"unit":"days"} | Expiry duration is a scalar stri',
  ],
  ["Session tokens expires after 1 day trailing words", "null"],
  [
    "Note: Session tokens expires after 1 day",
    '0.88 | expire after 1 day | {"subject_key":"note.session.token","property_key":"expiry_days","operator":"eq","value_type":"int","value_int":1,"unit":"days"} | Expiry duration is a scalar stri',
  ],
  [
    "Session tokens EXPIRE after 2 Hours",
    '0.88 | expire after 2 Hours | {"subject_key":"session.token","property_key":"expiry_hours","operator":"eq","value_type":"int","value_int":2,"unit":"hours"} | Expiry duration is a scalar stri',
  ],
  [
    "Session  tokens  EXPIRE  after  2  Hours",
    '0.88 | expire after 2 Hours | {"subject_key":"session.token","property_key":"expiry_hours","operator":"eq","value_type":"int","value_int":2,"unit":"hours"} | Expiry duration is a scalar stri',
  ],
  ["Session tokens EXPIRE after 2 Hours trailing words", "null"],
  [
    "Note: Session tokens EXPIRE after 2 Hours",
    '0.88 | expire after 2 Hours | {"subject_key":"note.session.token","property_key":"expiry_hours","operator":"eq","value_type":"int","value_int":2,"unit":"hours"} | Expiry duration is a scalar stri',
  ],
  [
    "Tokens expire after 5 minutes",
    '0.88 | expire after 5 minutes | {"subject_key":"token","property_key":"expiry_minutes","operator":"eq","value_type":"int","value_int":5,"unit":"minutes"} | Expiry duration is a scalar stri',
  ],
  [
    "Tokens  expire  after  5  minutes",
    '0.88 | expire after 5 minutes | {"subject_key":"token","property_key":"expiry_minutes","operator":"eq","value_type":"int","value_int":5,"unit":"minutes"} | Expiry duration is a scalar stri',
  ],
  ["Tokens expire after 5 minutes trailing words", "null"],
  [
    "Note: Tokens expire after 5 minutes",
    '0.88 | expire after 5 minutes | {"subject_key":"note.token","property_key":"expiry_minutes","operator":"eq","value_type":"int","value_int":5,"unit":"minutes"} | Expiry duration is a scalar stri',
  ],
  [
    "Tokens expire after 5 minute",
    '0.88 | expire after 5 minute | {"subject_key":"token","property_key":"expiry_minutes","operator":"eq","value_type":"int","value_int":5,"unit":"minutes"} | Expiry duration is a scalar stri',
  ],
  [
    "Tokens  expire  after  5  minute",
    '0.88 | expire after 5 minute | {"subject_key":"token","property_key":"expiry_minutes","operator":"eq","value_type":"int","value_int":5,"unit":"minutes"} | Expiry duration is a scalar stri',
  ],
  ["Tokens expire after 5 minute trailing words", "null"],
  [
    "Note: Tokens expire after 5 minute",
    '0.88 | expire after 5 minute | {"subject_key":"note.token","property_key":"expiry_minutes","operator":"eq","value_type":"int","value_int":5,"unit":"minutes"} | Expiry duration is a scalar stri',
  ],
  [
    "Tokens expire after 3 months",
    '0.88 | expire after 3 months | {"subject_key":"token","property_key":"expiry_months","operator":"eq","value_type":"int","value_int":3,"unit":"months"} | Expiry duration is a scalar stri',
  ],
  [
    "Tokens  expire  after  3  months",
    '0.88 | expire after 3 months | {"subject_key":"token","property_key":"expiry_months","operator":"eq","value_type":"int","value_int":3,"unit":"months"} | Expiry duration is a scalar stri',
  ],
  ["Tokens expire after 3 months trailing words", "null"],
  [
    "Note: Tokens expire after 3 months",
    '0.88 | expire after 3 months | {"subject_key":"note.token","property_key":"expiry_months","operator":"eq","value_type":"int","value_int":3,"unit":"months"} | Expiry duration is a scalar stri',
  ],
  [
    "Tokens expire after 3 years",
    '0.88 | expire after 3 years | {"subject_key":"token","property_key":"expiry_years","operator":"eq","value_type":"int","value_int":3,"unit":"years"} | Expiry duration is a scalar stri',
  ],
  [
    "Tokens  expire  after  3  years",
    '0.88 | expire after 3 years | {"subject_key":"token","property_key":"expiry_years","operator":"eq","value_type":"int","value_int":3,"unit":"years"} | Expiry duration is a scalar stri',
  ],
  ["Tokens expire after 3 years trailing words", "null"],
  [
    "Note: Tokens expire after 3 years",
    '0.88 | expire after 3 years | {"subject_key":"note.token","property_key":"expiry_years","operator":"eq","value_type":"int","value_int":3,"unit":"years"} | Expiry duration is a scalar stri',
  ],
  ["Tokens expire after 3 weeks", "null"],
  ["Tokens  expire  after  3  weeks", "null"],
  ["Tokens expire after 3 weeks trailing words", "null"],
  ["Note: Tokens expire after 3 weeks", "null"],
  ["Tokens expire after soon", "null"],
  ["Tokens  expire  after  soon", "null"],
  ["Tokens expire after soon trailing words", "null"],
  ["Note: Tokens expire after soon", "null"],
  [
    "The cart total must be less than 100.",
    '0.86 | less than 100 | {"subject_key":"the.cart.total","property_key":"value","operator":"lt","value_type":"int","value_int":100} | Comparative numeric prose is a s',
  ],
  [
    "The  cart  total  must  be  less  than  100",
    '0.86 | less  than 100 | {"subject_key":"the.cart.total","property_key":"value","operator":"lt","value_type":"int","value_int":100} | Comparative numeric prose is a s',
  ],
  ["The cart total must be less than 100 trailing words", "null"],
  [
    "Note: The cart total must be less than 100.",
    '0.86 | less than 100 | {"subject_key":"note.the.cart.total","property_key":"value","operator":"lt","value_type":"int","value_int":100} | Comparative numeric prose is a s',
  ],
  [
    "The cart total must be greater than 1",
    '0.86 | greater than 1 | {"subject_key":"the.cart.total","property_key":"value","operator":"gt","value_type":"int","value_int":1} | Comparative numeric prose is a s',
  ],
  [
    "The  cart  total  must  be  greater  than  1",
    '0.86 | greater  than 1 | {"subject_key":"the.cart.total","property_key":"value","operator":"gt","value_type":"int","value_int":1} | Comparative numeric prose is a s',
  ],
  ["The cart total must be greater than 1 trailing words", "null"],
  [
    "Note: The cart total must be greater than 1",
    '0.86 | greater than 1 | {"subject_key":"note.the.cart.total","property_key":"value","operator":"gt","value_type":"int","value_int":1} | Comparative numeric prose is a s',
  ],
  [
    "The cart total shall be below 9",
    '0.86 | below 9 | {"subject_key":"the.cart.total","property_key":"value","operator":"lt","value_type":"int","value_int":9} | Comparative numeric prose is a s',
  ],
  [
    "The  cart  total  shall  be  below  9",
    '0.86 | below 9 | {"subject_key":"the.cart.total","property_key":"value","operator":"lt","value_type":"int","value_int":9} | Comparative numeric prose is a s',
  ],
  ["The cart total shall be below 9 trailing words", "null"],
  [
    "Note: The cart total shall be below 9",
    '0.86 | below 9 | {"subject_key":"note.the.cart.total","property_key":"value","operator":"lt","value_type":"int","value_int":9} | Comparative numeric prose is a s',
  ],
  [
    "The cart total should be above 9",
    '0.86 | above 9 | {"subject_key":"the.cart.total","property_key":"value","operator":"gt","value_type":"int","value_int":9} | Comparative numeric prose is a s',
  ],
  [
    "The  cart  total  should  be  above  9",
    '0.86 | above 9 | {"subject_key":"the.cart.total","property_key":"value","operator":"gt","value_type":"int","value_int":9} | Comparative numeric prose is a s',
  ],
  ["The cart total should be above 9 trailing words", "null"],
  [
    "Note: The cart total should be above 9",
    '0.86 | above 9 | {"subject_key":"note.the.cart.total","property_key":"value","operator":"gt","value_type":"int","value_int":9} | Comparative numeric prose is a s',
  ],
  [
    "The cart total must be minimum 2",
    '0.86 | minimum 2 | {"subject_key":"the.cart.total","property_key":"value","operator":"gte","value_type":"int","value_int":2} | Comparative numeric prose is a s',
  ],
  [
    "The  cart  total  must  be  minimum  2",
    '0.86 | minimum 2 | {"subject_key":"the.cart.total","property_key":"value","operator":"gte","value_type":"int","value_int":2} | Comparative numeric prose is a s',
  ],
  ["The cart total must be minimum 2 trailing words", "null"],
  [
    "Note: The cart total must be minimum 2",
    '0.86 | minimum 2 | {"subject_key":"note.the.cart.total","property_key":"value","operator":"gte","value_type":"int","value_int":2} | Comparative numeric prose is a s',
  ],
  [
    "The cart total must be maximum 2",
    '0.86 | maximum 2 | {"subject_key":"the.cart.total","property_key":"value","operator":"lte","value_type":"int","value_int":2} | Comparative numeric prose is a s',
  ],
  [
    "The  cart  total  must  be  maximum  2",
    '0.86 | maximum 2 | {"subject_key":"the.cart.total","property_key":"value","operator":"lte","value_type":"int","value_int":2} | Comparative numeric prose is a s',
  ],
  ["The cart total must be maximum 2 trailing words", "null"],
  [
    "Note: The cart total must be maximum 2",
    '0.86 | maximum 2 | {"subject_key":"note.the.cart.total","property_key":"value","operator":"lte","value_type":"int","value_int":2} | Comparative numeric prose is a s',
  ],
  [
    "The cart total must be at least 2",
    '0.86 | at least 2 | {"subject_key":"the.cart.total","property_key":"value","operator":"gte","value_type":"int","value_int":2} | Comparative numeric prose is a s',
  ],
  [
    "The  cart  total  must  be  at  least  2",
    '0.86 | at  least 2 | {"subject_key":"the.cart.total","property_key":"value","operator":"gte","value_type":"int","value_int":2} | Comparative numeric prose is a s',
  ],
  [
    "The cart total must be at least 2 trailing words",
    '0.9 | at least 2 | {"subject_key":"trailing.words","property_key":"count","operator":"gte","value_type":"int","value_int":2} | Bounded cardinality is a strict ',
  ],
  [
    "Note: The cart total must be at least 2",
    '0.86 | at least 2 | {"subject_key":"note.the.cart.total","property_key":"value","operator":"gte","value_type":"int","value_int":2} | Comparative numeric prose is a s',
  ],
  [
    "The cart total must be at most 2",
    '0.86 | at most 2 | {"subject_key":"the.cart.total","property_key":"value","operator":"lte","value_type":"int","value_int":2} | Comparative numeric prose is a s',
  ],
  [
    "The  cart  total  must  be  at  most  2",
    '0.86 | at  most 2 | {"subject_key":"the.cart.total","property_key":"value","operator":"lte","value_type":"int","value_int":2} | Comparative numeric prose is a s',
  ],
  [
    "The cart total must be at most 2 trailing words",
    '0.9 | at most 2 | {"subject_key":"trailing.words","property_key":"count","operator":"lte","value_type":"int","value_int":2} | Bounded cardinality is a strict ',
  ],
  [
    "Note: The cart total must be at most 2",
    '0.86 | at most 2 | {"subject_key":"note.the.cart.total","property_key":"value","operator":"lte","value_type":"int","value_int":2} | Comparative numeric prose is a s',
  ],
  [
    "The cart total must be AT  LEAST 2",
    '0.86 | AT  LEAST 2 | {"subject_key":"the.cart.total","property_key":"value","operator":"gte","value_type":"int","value_int":2} | Comparative numeric prose is a s',
  ],
  [
    "The  cart  total  must  be  AT    LEAST  2",
    '0.86 | AT    LEAST 2 | {"subject_key":"the.cart.total","property_key":"value","operator":"gte","value_type":"int","value_int":2} | Comparative numeric prose is a s',
  ],
  [
    "The cart total must be AT  LEAST 2 trailing words",
    '0.9 | AT  LEAST 2 | {"subject_key":"trailing.words","property_key":"count","operator":"gte","value_type":"int","value_int":2} | Bounded cardinality is a strict ',
  ],
  [
    "Note: The cart total must be AT  LEAST 2",
    '0.86 | AT  LEAST 2 | {"subject_key":"note.the.cart.total","property_key":"value","operator":"gte","value_type":"int","value_int":2} | Comparative numeric prose is a s',
  ],
  ["The cart total must be about 2", "null"],
  ["The  cart  total  must  be  about  2", "null"],
  ["The cart total must be about 2 trailing words", "null"],
  ["Note: The cart total must be about 2", "null"],
  [
    "Slots must normalize into canonical integer decisecond slot values.",
    '0.9 | Slots must normalize into canonical integer decisecond slot values. | {"subject_key":"slot","property_key":"slot_precision","operator":"eq","value_type":"string","value_string":"decisecond"} | Canonical decisecond slot prose ',
  ],
  [
    "Slots  must  normalize  into  canonical  integer  decisecond  slot  values",
    '0.9 | Slots  must  normalize  into  canonical  integer  decisecond  slot  values | {"subject_key":"slot","property_key":"slot_precision","operator":"eq","value_type":"string","value_string":"decisecond"} | Canonical decisecond slot prose ',
  ],
  [
    "Slots must normalize into canonical integer decisecond slot values trailing words",
    "null",
  ],
  [
    "Note: Slots must normalize into canonical integer decisecond slot values.",
    '0.9 | Note: Slots must normalize into canonical integer decisecond slot values. | {"subject_key":"slot","property_key":"slot_precision","operator":"eq","value_type":"string","value_string":"decisecond"} | Canonical decisecond slot prose ',
  ],
  [
    "Slots must normalize into canonical integer decisecond Slot value",
    '0.9 | Slots must normalize into canonical integer decisecond Slot value | {"subject_key":"slot","property_key":"slot_precision","operator":"eq","value_type":"string","value_string":"decisecond"} | Canonical decisecond slot prose ',
  ],
  [
    "Slots  must  normalize  into  canonical  integer  decisecond  Slot  value",
    '0.9 | Slots  must  normalize  into  canonical  integer  decisecond  Slot  value | {"subject_key":"slot","property_key":"slot_precision","operator":"eq","value_type":"string","value_string":"decisecond"} | Canonical decisecond slot prose ',
  ],
  [
    "Slots must normalize into canonical integer decisecond Slot value trailing words",
    "null",
  ],
  [
    "Note: Slots must normalize into canonical integer decisecond Slot value",
    '0.9 | Note: Slots must normalize into canonical integer decisecond Slot value | {"subject_key":"slot","property_key":"slot_precision","operator":"eq","value_type":"string","value_string":"decisecond"} | Canonical decisecond slot prose ',
  ],
  [
    "Slots must normalize into canonical integer decisecond 9slot values",
    "null",
  ],
  [
    "Slots  must  normalize  into  canonical  integer  decisecond  9slot  values",
    "null",
  ],
  [
    "Slots must normalize into canonical integer decisecond 9slot values trailing words",
    "null",
  ],
  [
    "Note: Slots must normalize into canonical integer decisecond 9slot values",
    "null",
  ],
  [
    "The API must return within 200 ms.",
    '0.88 | within 200 ms | {"subject_key":"the.api","property_key":"latency_ms","operator":"lte","value_type":"int","value_int":200,"unit":"ms"} | Response-time thresholds are bou',
  ],
  [
    "The  API  must  return  within  200  ms",
    '0.88 | within 200 ms | {"subject_key":"the.api","property_key":"latency_ms","operator":"lte","value_type":"int","value_int":200,"unit":"ms"} | Response-time thresholds are bou',
  ],
  ["The API must return within 200 ms trailing words", "null"],
  [
    "Note: The API must return within 200 ms.",
    '0.88 | within 200 ms | {"subject_key":"note.the.api","property_key":"latency_ms","operator":"lte","value_type":"int","value_int":200,"unit":"ms"} | Response-time thresholds are bou',
  ],
  [
    "The API must return within 2 milliseconds",
    '0.88 | within 2 milliseconds | {"subject_key":"the.api","property_key":"latency_ms","operator":"lte","value_type":"int","value_int":2,"unit":"ms"} | Response-time thresholds are bou',
  ],
  [
    "The  API  must  return  within  2  milliseconds",
    '0.88 | within 2 milliseconds | {"subject_key":"the.api","property_key":"latency_ms","operator":"lte","value_type":"int","value_int":2,"unit":"ms"} | Response-time thresholds are bou',
  ],
  ["The API must return within 2 milliseconds trailing words", "null"],
  [
    "Note: The API must return within 2 milliseconds",
    '0.88 | within 2 milliseconds | {"subject_key":"note.the.api","property_key":"latency_ms","operator":"lte","value_type":"int","value_int":2,"unit":"ms"} | Response-time thresholds are bou',
  ],
  [
    "The API must return within 2 millisecond",
    '0.88 | within 2 millisecond | {"subject_key":"the.api","property_key":"latency_ms","operator":"lte","value_type":"int","value_int":2,"unit":"ms"} | Response-time thresholds are bou',
  ],
  [
    "The  API  must  return  within  2  millisecond",
    '0.88 | within 2 millisecond | {"subject_key":"the.api","property_key":"latency_ms","operator":"lte","value_type":"int","value_int":2,"unit":"ms"} | Response-time thresholds are bou',
  ],
  ["The API must return within 2 millisecond trailing words", "null"],
  [
    "Note: The API must return within 2 millisecond",
    '0.88 | within 2 millisecond | {"subject_key":"note.the.api","property_key":"latency_ms","operator":"lte","value_type":"int","value_int":2,"unit":"ms"} | Response-time thresholds are bou',
  ],
  [
    "The API must return within 2 s",
    '0.88 | within 2 s | {"subject_key":"the.api","property_key":"latency_seconds","operator":"lte","value_type":"int","value_int":2,"unit":"seconds"} | Response-time thresholds are bou',
  ],
  [
    "The  API  must  return  within  2  s",
    '0.88 | within 2 s | {"subject_key":"the.api","property_key":"latency_seconds","operator":"lte","value_type":"int","value_int":2,"unit":"seconds"} | Response-time thresholds are bou',
  ],
  ["The API must return within 2 s trailing words", "null"],
  [
    "Note: The API must return within 2 s",
    '0.88 | within 2 s | {"subject_key":"note.the.api","property_key":"latency_seconds","operator":"lte","value_type":"int","value_int":2,"unit":"seconds"} | Response-time thresholds are bou',
  ],
  [
    "The API must return within 2 sec",
    '0.88 | within 2 sec | {"subject_key":"the.api","property_key":"latency_seconds","operator":"lte","value_type":"int","value_int":2,"unit":"seconds"} | Response-time thresholds are bou',
  ],
  [
    "The  API  must  return  within  2  sec",
    '0.88 | within 2 sec | {"subject_key":"the.api","property_key":"latency_seconds","operator":"lte","value_type":"int","value_int":2,"unit":"seconds"} | Response-time thresholds are bou',
  ],
  ["The API must return within 2 sec trailing words", "null"],
  [
    "Note: The API must return within 2 sec",
    '0.88 | within 2 sec | {"subject_key":"note.the.api","property_key":"latency_seconds","operator":"lte","value_type":"int","value_int":2,"unit":"seconds"} | Response-time thresholds are bou',
  ],
  [
    "The API must return within 2 secs",
    '0.88 | within 2 secs | {"subject_key":"the.api","property_key":"latency_seconds","operator":"lte","value_type":"int","value_int":2,"unit":"seconds"} | Response-time thresholds are bou',
  ],
  [
    "The  API  must  return  within  2  secs",
    '0.88 | within 2 secs | {"subject_key":"the.api","property_key":"latency_seconds","operator":"lte","value_type":"int","value_int":2,"unit":"seconds"} | Response-time thresholds are bou',
  ],
  ["The API must return within 2 secs trailing words", "null"],
  [
    "Note: The API must return within 2 secs",
    '0.88 | within 2 secs | {"subject_key":"note.the.api","property_key":"latency_seconds","operator":"lte","value_type":"int","value_int":2,"unit":"seconds"} | Response-time thresholds are bou',
  ],
  [
    "The API must return within 2 seconds",
    '0.88 | within 2 seconds | {"subject_key":"the.api","property_key":"latency_seconds","operator":"lte","value_type":"int","value_int":2,"unit":"seconds"} | Response-time thresholds are bou',
  ],
  [
    "The  API  must  return  within  2  seconds",
    '0.88 | within 2 seconds | {"subject_key":"the.api","property_key":"latency_seconds","operator":"lte","value_type":"int","value_int":2,"unit":"seconds"} | Response-time thresholds are bou',
  ],
  ["The API must return within 2 seconds trailing words", "null"],
  [
    "Note: The API must return within 2 seconds",
    '0.88 | within 2 seconds | {"subject_key":"note.the.api","property_key":"latency_seconds","operator":"lte","value_type":"int","value_int":2,"unit":"seconds"} | Response-time thresholds are bou',
  ],
  [
    "The API must return within 2 Seconds",
    '0.88 | within 2 Seconds | {"subject_key":"the.api","property_key":"latency_seconds","operator":"lte","value_type":"int","value_int":2,"unit":"seconds"} | Response-time thresholds are bou',
  ],
  [
    "The  API  must  return  within  2  Seconds",
    '0.88 | within 2 Seconds | {"subject_key":"the.api","property_key":"latency_seconds","operator":"lte","value_type":"int","value_int":2,"unit":"seconds"} | Response-time thresholds are bou',
  ],
  ["The API must return within 2 Seconds trailing words", "null"],
  [
    "Note: The API must return within 2 Seconds",
    '0.88 | within 2 Seconds | {"subject_key":"note.the.api","property_key":"latency_seconds","operator":"lte","value_type":"int","value_int":2,"unit":"seconds"} | Response-time thresholds are bou',
  ],
  [
    "The API must return within 2 MS",
    '0.88 | within 2 MS | {"subject_key":"the.api","property_key":"latency_ms","operator":"lte","value_type":"int","value_int":2,"unit":"ms"} | Response-time thresholds are bou',
  ],
  [
    "The  API  must  return  within  2  MS",
    '0.88 | within 2 MS | {"subject_key":"the.api","property_key":"latency_ms","operator":"lte","value_type":"int","value_int":2,"unit":"ms"} | Response-time thresholds are bou',
  ],
  ["The API must return within 2 MS trailing words", "null"],
  [
    "Note: The API must return within 2 MS",
    '0.88 | within 2 MS | {"subject_key":"note.the.api","property_key":"latency_ms","operator":"lte","value_type":"int","value_int":2,"unit":"ms"} | Response-time thresholds are bou',
  ],
  ["The API must return within 2 hours", "null"],
  ["The  API  must  return  within  2  hours", "null"],
  ["The API must return within 2 hours trailing words", "null"],
  ["Note: The API must return within 2 hours", "null"],
  [
    "Dark mode must be enabled.",
    '0.88 | be enabled | {"subject_key":"dark.mode","property_key":"enabled","operator":"eq","value_type":"bool","value_bool":true} | Enabled/disabled requirements ar',
  ],
  [
    "Dark  mode  must  be  enabled",
    '0.88 | be enabled | {"subject_key":"dark.mode","property_key":"enabled","operator":"eq","value_type":"bool","value_bool":true} | Enabled/disabled requirements ar',
  ],
  ["Dark mode must be enabled trailing words", "null"],
  [
    "Note: Dark mode must be enabled.",
    '0.88 | be enabled | {"subject_key":"note.dark.mode","property_key":"enabled","operator":"eq","value_type":"bool","value_bool":true} | Enabled/disabled requirements ar',
  ],
  [
    "Dark mode must be Disabled",
    '0.88 | be Disabled | {"subject_key":"dark.mode","property_key":"enabled","operator":"eq","value_type":"bool","value_bool":false} | Enabled/disabled requirements ar',
  ],
  [
    "Dark  mode  must  be  Disabled",
    '0.88 | be Disabled | {"subject_key":"dark.mode","property_key":"enabled","operator":"eq","value_type":"bool","value_bool":false} | Enabled/disabled requirements ar',
  ],
  ["Dark mode must be Disabled trailing words", "null"],
  [
    "Note: Dark mode must be Disabled",
    '0.88 | be Disabled | {"subject_key":"note.dark.mode","property_key":"enabled","operator":"eq","value_type":"bool","value_bool":false} | Enabled/disabled requirements ar',
  ],
  [
    "Dark mode must be ENABLED",
    '0.88 | be ENABLED | {"subject_key":"dark.mode","property_key":"enabled","operator":"eq","value_type":"bool","value_bool":true} | Enabled/disabled requirements ar',
  ],
  [
    "Dark  mode  must  be  ENABLED",
    '0.88 | be ENABLED | {"subject_key":"dark.mode","property_key":"enabled","operator":"eq","value_type":"bool","value_bool":true} | Enabled/disabled requirements ar',
  ],
  ["Dark mode must be ENABLED trailing words", "null"],
  [
    "Note: Dark mode must be ENABLED",
    '0.88 | be ENABLED | {"subject_key":"note.dark.mode","property_key":"enabled","operator":"eq","value_type":"bool","value_bool":true} | Enabled/disabled requirements ar',
  ],
  [
    "Audit logs must be retained for 7 years.",
    '0.92 | retained for 7 years | {"subject_key":"audit.log","property_key":"retention_years","operator":"eq","value_type":"int","value_int":7,"unit":"years"} | Retention duration is a scalar s',
  ],
  [
    "Audit  logs  must  be  retained  for  7  years",
    '0.92 | retained for 7 years | {"subject_key":"audit.log","property_key":"retention_years","operator":"eq","value_type":"int","value_int":7,"unit":"years"} | Retention duration is a scalar s',
  ],
  ["Audit logs must be retained for 7 years trailing words", "null"],
  [
    "Note: Audit logs must be retained for 7 years.",
    '0.92 | retained for 7 years | {"subject_key":"note.audit.log","property_key":"retention_years","operator":"eq","value_type":"int","value_int":7,"unit":"years"} | Retention duration is a scalar s',
  ],
  [
    "Audit logs must be retained for 1 day",
    '0.92 | retained for 1 day | {"subject_key":"audit.log","property_key":"retention_days","operator":"eq","value_type":"int","value_int":1,"unit":"days"} | Retention duration is a scalar s',
  ],
  [
    "Audit  logs  must  be  retained  for  1  day",
    '0.92 | retained for 1 day | {"subject_key":"audit.log","property_key":"retention_days","operator":"eq","value_type":"int","value_int":1,"unit":"days"} | Retention duration is a scalar s',
  ],
  ["Audit logs must be retained for 1 day trailing words", "null"],
  [
    "Note: Audit logs must be retained for 1 day",
    '0.92 | retained for 1 day | {"subject_key":"note.audit.log","property_key":"retention_days","operator":"eq","value_type":"int","value_int":1,"unit":"days"} | Retention duration is a scalar s',
  ],
  [
    "Audit logs must be retained for 2 Months",
    '0.92 | retained for 2 Months | {"subject_key":"audit.log","property_key":"retention_months","operator":"eq","value_type":"int","value_int":2,"unit":"months"} | Retention duration is a scalar s',
  ],
  [
    "Audit  logs  must  be  retained  for  2  Months",
    '0.92 | retained for 2 Months | {"subject_key":"audit.log","property_key":"retention_months","operator":"eq","value_type":"int","value_int":2,"unit":"months"} | Retention duration is a scalar s',
  ],
  ["Audit logs must be retained for 2 Months trailing words", "null"],
  [
    "Note: Audit logs must be retained for 2 Months",
    '0.92 | retained for 2 Months | {"subject_key":"note.audit.log","property_key":"retention_months","operator":"eq","value_type":"int","value_int":2,"unit":"months"} | Retention duration is a scalar s',
  ],
  ["Audit logs must be retained for 2 weeks", "null"],
  ["Audit  logs  must  be  retained  for  2  weeks", "null"],
  ["Audit logs must be retained for 2 weeks trailing words", "null"],
  ["Note: Audit logs must be retained for 2 weeks", "null"],
  [
    "Every currency in GBP, ILS and ZAR must fail closed.",
    '0.84 | in GBP, ILS and ZAR | {"subject_key":"currency","property_key":"fail_closed","operator":"includes","value_type":"set","value_set":["GBP","ILS","ZAR"]} | A claim that every member of a c',
  ],
  [
    "Every  currency  in  GBP,  ILS  and  ZAR  must  fail  closed",
    '0.84 | in GBP,  ILS  and  ZAR | {"subject_key":"currency","property_key":"fail_closed","operator":"includes","value_type":"set","value_set":["GBP","ILS","ZAR"]} | A claim that every member of a c',
  ],
  [
    "Every currency in GBP, ILS and ZAR must fail closed trailing words",
    '0.84 | in GBP, ILS and ZAR | {"subject_key":"currency","property_key":"fail_closed_trailing_words","operator":"includes","value_type":"set","value_set":["GBP","ILS","ZAR"]} | A claim that every member of a c',
  ],
  ["Note: Every currency in GBP, ILS and ZAR must fail closed.", "null"],
  [
    "Every currency in GBP or ZAR or GBP must fail closed",
    '0.84 | in GBP or ZAR or GBP | {"subject_key":"currency","property_key":"fail_closed","operator":"includes","value_type":"set","value_set":["GBP","ZAR"]} | A claim that every member of a c',
  ],
  [
    "Every  currency  in  GBP  or  ZAR  or  GBP  must  fail  closed",
    '0.84 | in GBP  or  ZAR  or  GBP | {"subject_key":"currency","property_key":"fail_closed","operator":"includes","value_type":"set","value_set":["GBP","ZAR"]} | A claim that every member of a c',
  ],
  [
    "Every currency in GBP or ZAR or GBP must fail closed trailing words",
    '0.84 | in GBP or ZAR or GBP | {"subject_key":"currency","property_key":"fail_closed_trailing_words","operator":"includes","value_type":"set","value_set":["GBP","ZAR"]} | A claim that every member of a c',
  ],
  ["Note: Every currency in GBP or ZAR or GBP must fail closed", "null"],
  ["Each currency in GBP must fail closed", "null"],
  ["Each  currency  in  GBP  must  fail  closed", "null"],
  ["Each currency in GBP must fail closed trailing words", "null"],
  ["Note: Each currency in GBP must fail closed", "null"],
  ["All currencies in GBP and ZAR must !!!", "null"],
  ["All  currencies  in  GBP  and  ZAR  must  !!!", "null"],
  [
    "All currencies in GBP and ZAR must !!! trailing words",
    '0.84 | in GBP and ZAR | {"subject_key":"currency","property_key":"trailing_words","operator":"includes","value_type":"set","value_set":["GBP","ZAR"]} | A claim that every member of a c',
  ],
  ["Note: All currencies in GBP and ZAR must !!!", "null"],
  [
    "All currencies in GBP and ZAR must one two three four five six seven eight",
    '0.84 | in GBP and ZAR | {"subject_key":"currency","property_key":"one_two_three_four_five_six","operator":"includes","value_type":"set","value_set":["GBP","ZAR"]} | A claim that every member of a c',
  ],
  [
    "All  currencies  in  GBP  and  ZAR  must  one  two  three  four  five  six  seven  eight",
    '0.84 | in GBP  and  ZAR | {"subject_key":"currency","property_key":"one_two_three_four_five_six","operator":"includes","value_type":"set","value_set":["GBP","ZAR"]} | A claim that every member of a c',
  ],
  [
    "All currencies in GBP and ZAR must one two three four five six seven eight trailing words",
    '0.84 | in GBP and ZAR | {"subject_key":"currency","property_key":"one_two_three_four_five_six","operator":"includes","value_type":"set","value_set":["GBP","ZAR"]} | A claim that every member of a c',
  ],
  [
    "Note: All currencies in GBP and ZAR must one two three four five six seven eight",
    "null",
  ],
  [
    "The code must match `^[A-Z]{3}$`.",
    '0.86 | match ^[A-Z]{3}$ | {"subject_key":"the.code","property_key":"format","operator":"matches","value_type":"string","value_string":"^[A-Z]{3}$"} | A required format is a string fa',
  ],
  [
    "The  code  must  match  `^[A-Z]{3}$`",
    '0.86 | match ^[A-Z]{3}$ | {"subject_key":"the.code","property_key":"format","operator":"matches","value_type":"string","value_string":"^[A-Z]{3}$"} | A required format is a string fa',
  ],
  ["The code must match `^[A-Z]{3}$` trailing words", "null"],
  [
    "Note: The code must match `^[A-Z]{3}$`.",
    '0.86 | match ^[A-Z]{3}$ | {"subject_key":"note.the.code","property_key":"format","operator":"matches","value_type":"string","value_string":"^[A-Z]{3}$"} | A required format is a string fa',
  ],
  [
    "The code must always match the pattern `x+`",
    '0.86 | match x+ | {"subject_key":"the.code","property_key":"format","operator":"matches","value_type":"string","value_string":"x+"} | A required format is a string fa',
  ],
  [
    "The  code  must  always  match  the  pattern  `x+`",
    '0.86 | match x+ | {"subject_key":"the.code","property_key":"format","operator":"matches","value_type":"string","value_string":"x+"} | A required format is a string fa',
  ],
  ["The code must always match the pattern `x+` trailing words", "null"],
  [
    "Note: The code must always match the pattern `x+`",
    '0.86 | match x+ | {"subject_key":"note.the.code","property_key":"format","operator":"matches","value_type":"string","value_string":"x+"} | A required format is a string fa',
  ],
  [
    "The code must match the regular expression /a|b/",
    '0.86 | match a|b | {"subject_key":"the.code","property_key":"format","operator":"matches","value_type":"string","value_string":"a|b"} | A required format is a string fa',
  ],
  [
    "The  code  must  match  the  regular  expression  /a|b/",
    '0.86 | match a|b | {"subject_key":"the.code","property_key":"format","operator":"matches","value_type":"string","value_string":"a|b"} | A required format is a string fa',
  ],
  ["The code must match the regular expression /a|b/ trailing words", "null"],
  [
    "Note: The code must match the regular expression /a|b/",
    '0.86 | match a|b | {"subject_key":"note.the.code","property_key":"format","operator":"matches","value_type":"string","value_string":"a|b"} | A required format is a string fa',
  ],
  [
    "The code must match the regex /a/.",
    '0.86 | match a | {"subject_key":"the.code","property_key":"format","operator":"matches","value_type":"string","value_string":"a"} | A required format is a string fa',
  ],
  [
    "The  code  must  match  the  regex  /a/",
    '0.86 | match a | {"subject_key":"the.code","property_key":"format","operator":"matches","value_type":"string","value_string":"a"} | A required format is a string fa',
  ],
  ["The code must match the regex /a/ trailing words", "null"],
  [
    "Note: The code must match the regex /a/.",
    '0.86 | match a | {"subject_key":"note.the.code","property_key":"format","operator":"matches","value_type":"string","value_string":"a"} | A required format is a string fa',
  ],
  ["The code must match ``", "null"],
  ["The  code  must  match  ``", "null"],
  ["The code must match `` trailing words", "null"],
  ["Note: The code must match ``", "null"],
  ["The code must match //", "null"],
  ["The  code  must  match  //", "null"],
  ["The code must match // trailing words", "null"],
  ["Note: The code must match //", "null"],
  [
    "The code must be `EUR`.",
    '0.86 | be EUR | {"subject_key":"the.code","property_key":"value","operator":"eq","value_type":"string","value_string":"EUR"} | An exact quoted value is a strin',
  ],
  [
    "The  code  must  be  `EUR`",
    '0.86 | be EUR | {"subject_key":"the.code","property_key":"value","operator":"eq","value_type":"string","value_string":"EUR"} | An exact quoted value is a strin',
  ],
  ["The code must be `EUR` trailing words", "null"],
  [
    "Note: The code must be `EUR`.",
    '0.86 | be EUR | {"subject_key":"note.the.code","property_key":"value","operator":"eq","value_type":"string","value_string":"EUR"} | An exact quoted value is a strin',
  ],
  [
    "The code must always be `EUR`",
    '0.86 | be EUR | {"subject_key":"the.code","property_key":"value","operator":"eq","value_type":"string","value_string":"EUR"} | An exact quoted value is a strin',
  ],
  [
    "The  code  must  always  be  `EUR`",
    '0.86 | be EUR | {"subject_key":"the.code","property_key":"value","operator":"eq","value_type":"string","value_string":"EUR"} | An exact quoted value is a strin',
  ],
  ["The code must always be `EUR` trailing words", "null"],
  [
    "Note: The code must always be `EUR`",
    '0.86 | be EUR | {"subject_key":"note.the.code","property_key":"value","operator":"eq","value_type":"string","value_string":"EUR"} | An exact quoted value is a strin',
  ],
  ["The code must be ``", "null"],
  ["The  code  must  be  ``", "null"],
  ["The code must be `` trailing words", "null"],
  ["Note: The code must be ``", "null"],
  [
    "A draft can never become sent.",
    '0.86 | draft ... never ... sent | {"subject_key":"workflow","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["draft->sent"]} | A state that can never reach ano',
  ],
  [
    "A  draft  can  never  become  sent",
    '0.86 | draft ... never ... sent | {"subject_key":"workflow","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["draft->sent"]} | A state that can never reach ano',
  ],
  ["A draft can never become sent trailing words", "null"],
  ["Note: A draft can never become sent.", "null"],
  [
    "The draft invoice can never become paid",
    '0.86 | draft ... never ... paid | {"subject_key":"invoice","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["draft->paid"]} | A state that can never reach ano',
  ],
  [
    "The  draft  invoice  can  never  become  paid",
    '0.86 | draft ... never ... paid | {"subject_key":"invoice","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["draft->paid"]} | A state that can never reach ano',
  ],
  ["The draft invoice can never become paid trailing words", "null"],
  ["Note: The draft invoice can never become paid", "null"],
  [
    "draft may never go back to new",
    '0.86 | draft ... never ... new | {"subject_key":"workflow","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["draft->new"]} | A state that can never reach ano',
  ],
  [
    "draft  may  never  go  back  to  new",
    '0.86 | draft ... never ... new | {"subject_key":"workflow","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["draft->new"]} | A state that can never reach ano',
  ],
  ["draft may never go back to new trailing words", "null"],
  ["Note: draft may never go back to new", "null"],
  [
    "draft must never transition to new",
    '0.86 | draft ... never ... new | {"subject_key":"workflow","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["draft->new"]} | A state that can never reach ano',
  ],
  [
    "draft  must  never  transition  to  new",
    '0.86 | draft ... never ... new | {"subject_key":"workflow","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["draft->new"]} | A state that can never reach ano',
  ],
  ["draft must never transition to new trailing words", "null"],
  ["Note: draft must never transition to new", "null"],
  [
    "draft shall never move to new",
    '0.86 | draft ... never ... new | {"subject_key":"workflow","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["draft->new"]} | A state that can never reach ano',
  ],
  [
    "draft  shall  never  move  to  new",
    '0.86 | draft ... never ... new | {"subject_key":"workflow","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["draft->new"]} | A state that can never reach ano',
  ],
  ["draft shall never move to new trailing words", "null"],
  ["Note: draft shall never move to new", "null"],
  [
    "draft should never reach new.",
    '0.86 | draft ... never ... new | {"subject_key":"workflow","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["draft->new"]} | A state that can never reach ano',
  ],
  [
    "draft  should  never  reach  new",
    '0.86 | draft ... never ... new | {"subject_key":"workflow","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["draft->new"]} | A state that can never reach ano',
  ],
  ["draft should never reach new trailing words", "null"],
  ["Note: draft should never reach new.", "null"],
  [
    "Draft invoice order can never go to Paid",
    '0.86 | Draft ... never ... Paid | {"subject_key":"invoice.order","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["draft->paid"]} | A state that can never reach ano',
  ],
  [
    "Draft  invoice  order  can  never  go  to  Paid",
    '0.86 | Draft ... never ... Paid | {"subject_key":"invoice.order","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["draft->paid"]} | A state that can never reach ano',
  ],
  ["Draft invoice order can never go to Paid trailing words", "null"],
  ["Note: Draft invoice order can never go to Paid", "null"],
  [
    "In the billing flow, every path from draft to paid must pass through approved.",
    '0.86 | path from draft to paid ... through approved | {"subject_key":"billing.flow","property_key":"required_waypoints","operator":"includes","value_type":"set","value_set":["draft->paid via approved"]} | A state every path passes throug',
  ],
  [
    "In  the  billing  flow,  every  path  from  draft  to  paid  must  pass  through  approved",
    '0.86 | path from draft to paid ... through approved | {"subject_key":"billing.flow","property_key":"required_waypoints","operator":"includes","value_type":"set","value_set":["draft->paid via approved"]} | A state every path passes throug',
  ],
  [
    "In the billing flow, every path from draft to paid must pass through approved trailing words",
    "null",
  ],
  [
    "Note: In the billing flow, every path from draft to paid must pass through approved.",
    "null",
  ],
  [
    "In a flow, each path from draft to paid should go through approved",
    '0.86 | path from draft to paid ... through approved | {"subject_key":"flow","property_key":"required_waypoints","operator":"includes","value_type":"set","value_set":["draft->paid via approved"]} | A state every path passes throug',
  ],
  [
    "In  a  flow,  each  path  from  draft  to  paid  should  go  through  approved",
    '0.86 | path from draft to paid ... through approved | {"subject_key":"flow","property_key":"required_waypoints","operator":"includes","value_type":"set","value_set":["draft->paid via approved"]} | A state every path passes throug',
  ],
  [
    "In a flow, each path from draft to paid should go through approved trailing words",
    "null",
  ],
  [
    "Note: In a flow, each path from draft to paid should go through approved",
    "null",
  ],
  [
    "Any path from draft to paid shall pass through approved",
    '0.86 | path from draft to paid ... through approved | {"subject_key":"workflow","property_key":"required_waypoints","operator":"includes","value_type":"set","value_set":["draft->paid via approved"]} | A state every path passes throug',
  ],
  [
    "Any  path  from  draft  to  paid  shall  pass  through  approved",
    '0.86 | path from draft to paid ... through approved | {"subject_key":"workflow","property_key":"required_waypoints","operator":"includes","value_type":"set","value_set":["draft->paid via approved"]} | A state every path passes throug',
  ],
  [
    "Any path from draft to paid shall pass through approved trailing words",
    "null",
  ],
  ["Note: Any path from draft to paid shall pass through approved", "null"],
  [
    "In billing, every path from draft to paid must pass through approved",
    '0.86 | path from draft to paid ... through approved | {"subject_key":"billing","property_key":"required_waypoints","operator":"includes","value_type":"set","value_set":["draft->paid via approved"]} | A state every path passes throug',
  ],
  [
    "In  billing,  every  path  from  draft  to  paid  must  pass  through  approved",
    '0.86 | path from draft to paid ... through approved | {"subject_key":"billing","property_key":"required_waypoints","operator":"includes","value_type":"set","value_set":["draft->paid via approved"]} | A state every path passes throug',
  ],
  [
    "In billing, every path from draft to paid must pass through approved trailing words",
    "null",
  ],
  [
    "Note: In billing, every path from draft to paid must pass through approved",
    "null",
  ],
  [
    "Every route under /admin must use auth.",
    '0.84 | under /admin ... auth | {"subject_key":"route.admin","property_key":"middleware","operator":"includes","value_type":"set","value_set":["auth"]} | Middleware every route under a p',
  ],
  [
    "Every  route  under  /admin  must  use  auth",
    '0.84 | under /admin ... auth | {"subject_key":"route.admin","property_key":"middleware","operator":"includes","value_type":"set","value_set":["auth"]} | Middleware every route under a p',
  ],
  ["Every route under /admin must use auth trailing words", "null"],
  ["Note: Every route under /admin must use auth.", "null"],
  [
    "Each endpoint below `/api/v1` should be protected by the auth and rateLimit middleware",
    '0.84 | under /api/v1 ... auth and rateLimit | {"subject_key":"route.api.v1","property_key":"middleware","operator":"includes","value_type":"set","value_set":["auth","rateLimit"]} | Middleware every route under a p',
  ],
  [
    "Each  endpoint  below  `/api/v1`  should  be  protected  by  the  auth  and  rateLimit  middleware",
    '0.84 | under /api/v1 ... auth  and  rateLimit | {"subject_key":"route.api.v1","property_key":"middleware","operator":"includes","value_type":"set","value_set":["auth","rateLimit"]} | Middleware every route under a p',
  ],
  [
    "Each endpoint below `/api/v1` should be protected by the auth and rateLimit middleware trailing words",
    "null",
  ],
  [
    "Note: Each endpoint below `/api/v1` should be protected by the auth and rateLimit middleware",
    "null",
  ],
  [
    "All handlers in /x must run @scope/pkg",
    '0.84 | under /x ... @scope/pkg | {"subject_key":"route.x","property_key":"middleware","operator":"includes","value_type":"set","value_set":["@scope/pkg"]} | Middleware every route under a p',
  ],
  [
    "All  handlers  in  /x  must  run  @scope/pkg",
    '0.84 | under /x ... @scope/pkg | {"subject_key":"route.x","property_key":"middleware","operator":"includes","value_type":"set","value_set":["@scope/pkg"]} | Middleware every route under a p',
  ],
  ["All handlers in /x must run @scope/pkg trailing words", "null"],
  ["Note: All handlers in /x must run @scope/pkg", "null"],
  [
    "All routes under /x must go through node:fs/promises, ./local",
    '0.84 | under /x ... node:fs/promises, ./local | {"subject_key":"route.x","property_key":"middleware","operator":"includes","value_type":"set","value_set":["./local","node:fs/promises"]} | Middleware every route under a p',
  ],
  [
    "All  routes  under  /x  must  go  through  node:fs/promises,  ./local",
    '0.84 | under /x ... node:fs/promises,  ./local | {"subject_key":"route.x","property_key":"middleware","operator":"includes","value_type":"set","value_set":["./local","node:fs/promises"]} | Middleware every route under a p',
  ],
  [
    "All routes under /x must go through node:fs/promises, ./local trailing words",
    "null",
  ],
  [
    "Note: All routes under /x must go through node:fs/promises, ./local",
    "null",
  ],
  [
    "Every route under /x must be guarded by auth",
    '0.84 | under /x ... auth | {"subject_key":"route.x","property_key":"middleware","operator":"includes","value_type":"set","value_set":["auth"]} | Middleware every route under a p',
  ],
  [
    "Every  route  under  /x  must  be  guarded  by  auth",
    '0.84 | under /x ... auth | {"subject_key":"route.x","property_key":"middleware","operator":"includes","value_type":"set","value_set":["auth"]} | Middleware every route under a p',
  ],
  ["Every route under /x must be guarded by auth trailing words", "null"],
  ["Note: Every route under /x must be guarded by auth", "null"],
  [
    "Every route under /x must apply auth middleware.",
    '0.84 | under /x ... auth | {"subject_key":"route.x","property_key":"middleware","operator":"includes","value_type":"set","value_set":["auth"]} | Middleware every route under a p',
  ],
  [
    "Every  route  under  /x  must  apply  auth  middleware",
    '0.84 | under /x ... auth | {"subject_key":"route.x","property_key":"middleware","operator":"includes","value_type":"set","value_set":["auth"]} | Middleware every route under a p',
  ],
  ["Every route under /x must apply auth middleware trailing words", "null"],
  ["Note: Every route under /x must apply auth middleware.", "null"],
  [
    "Every route under /x must use the auth middleware.",
    '0.84 | under /x ... auth | {"subject_key":"route.x","property_key":"middleware","operator":"includes","value_type":"set","value_set":["auth"]} | Middleware every route under a p',
  ],
  [
    "Every  route  under  /x  must  use  the  auth  middleware",
    '0.84 | under /x ... auth | {"subject_key":"route.x","property_key":"middleware","operator":"includes","value_type":"set","value_set":["auth"]} | Middleware every route under a p',
  ],
  ["Every route under /x must use the auth middleware trailing words", "null"],
  ["Note: Every route under /x must use the auth middleware.", "null"],
  ["Every route under /x must use some auth thing", "null"],
  ["Every  route  under  /x  must  use  some  auth  thing", "null"],
  ["Every route under /x must use some auth thing trailing words", "null"],
  ["Note: Every route under /x must use some auth thing", "null"],
  ["Every route under x must use auth", "null"],
  ["Every  route  under  x  must  use  auth", "null"],
  ["Every route under x must use auth trailing words", "null"],
  ["Note: Every route under x must use auth", "null"],
  [
    "Every table must have id.",
    '0.84 | have id | {"subject_key":"table","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  [
    "Every  table  must  have  id",
    '0.84 | have id | {"subject_key":"table","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  ["Every table must have id trailing words", "null"],
  ["Note: Every table must have id.", "null"],
  [
    "Every table must have the field owner_id",
    '0.84 | have owner_id | {"subject_key":"table","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["owner_id"]} | Fields every table or object mus',
  ],
  [
    "Every  table  must  have  the  field  owner_id",
    '0.84 | have owner_id | {"subject_key":"table","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["owner_id"]} | Fields every table or object mus',
  ],
  ["Every table must have the field owner_id trailing words", "null"],
  ["Note: Every table must have the field owner_id", "null"],
  [
    "Each organization must have the field owner_id",
    '0.84 | have owner_id | {"subject_key":"organization","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["owner_id"]} | Fields every table or object mus',
  ],
  [
    "Each  organization  must  have  the  field  owner_id",
    '0.84 | have owner_id | {"subject_key":"organization","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["owner_id"]} | Fields every table or object mus',
  ],
  ["Each organization must have the field owner_id trailing words", "null"],
  ["Note: Each organization must have the field owner_id", "null"],
  [
    "Each organization must have an owner_id column",
    '0.84 | have owner_id | {"subject_key":"organization","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["owner_id"]} | Fields every table or object mus',
  ],
  [
    "Each  organization  must  have  an  owner_id  column",
    '0.84 | have owner_id | {"subject_key":"organization","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["owner_id"]} | Fields every table or object mus',
  ],
  ["Each organization must have an owner_id column trailing words", "null"],
  ["Note: Each organization must have an owner_id column", "null"],
  ["Each organization must have an owner", "null"],
  ["Each  organization  must  have  an  owner", "null"],
  ["Each organization must have an owner trailing words", "null"],
  ["Note: Each organization must have an owner", "null"],
  [
    "All objects must include the required fields id and name.",
    '0.84 | have id and name | {"subject_key":"object","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id","name"]} | Fields every table or object mus',
  ],
  [
    "All  objects  must  include  the  required  fields  id  and  name",
    '0.84 | have id  and  name | {"subject_key":"object","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id","name"]} | Fields every table or object mus',
  ],
  [
    "All objects must include the required fields id and name trailing words",
    "null",
  ],
  ["Note: All objects must include the required fields id and name.", "null"],
  [
    "Every object must declare a non-null property id",
    '0.84 | have id | {"subject_key":"object","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  [
    "Every  object  must  declare  a  non-null  property  id",
    '0.84 | have id | {"subject_key":"object","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  ["Every object must declare a non-null property id trailing words", "null"],
  ["Note: Every object must declare a non-null property id", "null"],
  [
    "Every object must contain id as required fields",
    '0.84 | have id | {"subject_key":"object","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  [
    "Every  object  must  contain  id  as  required  fields",
    '0.84 | have id | {"subject_key":"object","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  ["Every object must contain id as required fields trailing words", "null"],
  ["Note: Every object must contain id as required fields", "null"],
  [
    "Every user must have id, name as non-null columns",
    '0.84 | have id, name | {"subject_key":"user","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id","name"]} | Fields every table or object mus',
  ],
  [
    "Every  user  must  have  id,  name  as  non-null  columns",
    '0.84 | have id,  name | {"subject_key":"user","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id","name"]} | Fields every table or object mus',
  ],
  ["Every user must have id, name as non-null columns trailing words", "null"],
  ["Note: Every user must have id, name as non-null columns", "null"],
  [
    "Every request body must define properties id",
    '0.84 | have id | {"subject_key":"request.body","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  [
    "Every  request  body  must  define  properties  id",
    '0.84 | have id | {"subject_key":"request.body","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  ["Every request body must define properties id trailing words", "null"],
  ["Note: Every request body must define properties id", "null"],
  [
    "Every response body must have id",
    '0.84 | have id | {"subject_key":"response.body","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  [
    "Every  response  body  must  have  id",
    '0.84 | have id | {"subject_key":"response.body","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  ["Every response body must have id trailing words", "null"],
  ["Note: Every response body must have id", "null"],
  ["Every schema must have 9id", "null"],
  ["Every  schema  must  have  9id", "null"],
  ["Every schema must have 9id trailing words", "null"],
  ["Note: Every schema must have 9id", "null"],
  [
    "Every entity must have id",
    '0.84 | have id | {"subject_key":"entity","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  [
    "Every  entity  must  have  id",
    '0.84 | have id | {"subject_key":"entity","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  ["Every entity must have id trailing words", "null"],
  ["Note: Every entity must have id", "null"],
  [
    "Every entities must have id",
    '0.84 | have id | {"subject_key":"entity","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  [
    "Every  entities  must  have  id",
    '0.84 | have id | {"subject_key":"entity","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  ["Every entities must have id trailing words", "null"],
  ["Note: Every entities must have id", "null"],
  [
    "Every payload must have id",
    '0.84 | have id | {"subject_key":"payload","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  [
    "Every  payload  must  have  id",
    '0.84 | have id | {"subject_key":"payload","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  ["Every payload must have id trailing words", "null"],
  ["Note: Every payload must have id", "null"],
  [
    "Every dto must have id",
    '0.84 | have id | {"subject_key":"dto","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  [
    "Every  dto  must  have  id",
    '0.84 | have id | {"subject_key":"dto","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  ["Every dto must have id trailing words", "null"],
  ["Note: Every dto must have id", "null"],
  [
    "Every interface must have id",
    '0.84 | have id | {"subject_key":"interface","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  [
    "Every  interface  must  have  id",
    '0.84 | have id | {"subject_key":"interface","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  ["Every interface must have id trailing words", "null"],
  ["Note: Every interface must have id", "null"],
  [
    "Every model must have id",
    '0.84 | have id | {"subject_key":"model","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  [
    "Every  model  must  have  id",
    '0.84 | have id | {"subject_key":"model","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  ["Every model must have id trailing words", "null"],
  ["Note: Every model must have id", "null"],
  [
    "Every record must have id",
    '0.84 | have id | {"subject_key":"record","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  [
    "Every  record  must  have  id",
    '0.84 | have id | {"subject_key":"record","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  ["Every record must have id trailing words", "null"],
  ["Note: Every record must have id", "null"],
  [
    "Every row must have id",
    '0.84 | have id | {"subject_key":"row","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  [
    "Every  row  must  have  id",
    '0.84 | have id | {"subject_key":"row","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  ["Every row must have id trailing words", "null"],
  ["Note: Every row must have id", "null"],
  [
    "Every type must have id",
    '0.84 | have id | {"subject_key":"type","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  [
    "Every  type  must  have  id",
    '0.84 | have id | {"subject_key":"type","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  ["Every type must have id trailing words", "null"],
  ["Note: Every type must have id", "null"],
  [
    "The deleted_at column of the users table must be nullable.",
    '0.84 | deleted_at ... nullable | {"subject_key":"user.table","property_key":"nullable_fields","operator":"includes","value_type":"set","value_set":["deleted_at"]} | A field that must accept null is',
  ],
  [
    "The  deleted_at  column  of  the  users  table  must  be  nullable",
    '0.84 | deleted_at ... nullable | {"subject_key":"user.table","property_key":"nullable_fields","operator":"includes","value_type":"set","value_set":["deleted_at"]} | A field that must accept null is',
  ],
  [
    "The deleted_at column of the users table must be nullable trailing words",
    "null",
  ],
  ["Note: The deleted_at column of the users table must be nullable.", "null"],
  [
    "deleted_at fields in users must be optional null",
    '0.84 | deleted_at ... nullable | {"subject_key":"user","property_key":"nullable_fields","operator":"includes","value_type":"set","value_set":["deleted_at"]} | A field that must accept null is',
  ],
  [
    "deleted_at  fields  in  users  must  be  optional  null",
    '0.84 | deleted_at ... nullable | {"subject_key":"user","property_key":"nullable_fields","operator":"includes","value_type":"set","value_set":["deleted_at"]} | A field that must accept null is',
  ],
  ["deleted_at fields in users must be optional null trailing words", "null"],
  ["Note: deleted_at fields in users must be optional null", "null"],
  [
    "The deleted_at property on users should be nullable",
    '0.84 | deleted_at ... nullable | {"subject_key":"user","property_key":"nullable_fields","operator":"includes","value_type":"set","value_set":["deleted_at"]} | A field that must accept null is',
  ],
  [
    "The  deleted_at  property  on  users  should  be  nullable",
    '0.84 | deleted_at ... nullable | {"subject_key":"user","property_key":"nullable_fields","operator":"includes","value_type":"set","value_set":["deleted_at"]} | A field that must accept null is',
  ],
  [
    "The deleted_at property on users should be nullable trailing words",
    "null",
  ],
  ["Note: The deleted_at property on users should be nullable", "null"],
  ["The deleted at column of users must be nullable", "null"],
  ["The  deleted  at  column  of  users  must  be  nullable", "null"],
  ["The deleted at column of users must be nullable trailing words", "null"],
  ["Note: The deleted at column of users must be nullable", "null"],
  [
    "Every status must be one of draft, sent or paid.",
    '0.84 | one of draft, sent or paid | {"subject_key":"status","property_key":"allowed_values","operator":"subset_of","value_type":"set","value_set":["draft","paid","sent"]} | A claim that every member stays ',
  ],
  [
    "Every  status  must  be  one  of  draft,  sent  or  paid",
    '0.84 | one of draft,  sent  or  paid | {"subject_key":"status","property_key":"allowed_values","operator":"subset_of","value_type":"set","value_set":["draft","paid","sent"]} | A claim that every member stays ',
  ],
  [
    "Every status must be one of draft, sent or paid trailing words",
    '0.84 | one of draft, sent or paid trailing words | {"subject_key":"status","property_key":"allowed_values","operator":"subset_of","value_type":"set","value_set":["draft","paid trailing words","sent"]} | A claim that every member stays ',
  ],
  [
    "Note: Every status must be one of draft, sent or paid.",
    '0.86 | one of draft, sent or paid | {"subject_key":"note.every.status","property_key":"allowed_values","operator":"eq","value_type":"set","value_set":["draft","paid","sent"]} | Allowed enum sets are explicit s',
  ],
  [
    "Each status must be declared in draft and sent",
    '0.84 | one of draft and sent | {"subject_key":"status","property_key":"allowed_values","operator":"subset_of","value_type":"set","value_set":["draft","sent"]} | A claim that every member stays ',
  ],
  [
    "Each  status  must  be  declared  in  draft  and  sent",
    '0.84 | one of draft  and  sent | {"subject_key":"status","property_key":"allowed_values","operator":"subset_of","value_type":"set","value_set":["draft","sent"]} | A claim that every member stays ',
  ],
  [
    "Each status must be declared in draft and sent trailing words",
    '0.84 | one of draft and sent trailing words | {"subject_key":"status","property_key":"allowed_values","operator":"subset_of","value_type":"set","value_set":["draft","sent trailing words"]} | A claim that every member stays ',
  ],
  ["Note: Each status must be declared in draft and sent", "null"],
  [
    "All statuses must be listed among draft, sent",
    '0.84 | one of draft, sent | {"subject_key":"statuse","property_key":"allowed_values","operator":"subset_of","value_type":"set","value_set":["draft","sent"]} | A claim that every member stays ',
  ],
  [
    "All  statuses  must  be  listed  among  draft,  sent",
    '0.84 | one of draft,  sent | {"subject_key":"statuse","property_key":"allowed_values","operator":"subset_of","value_type":"set","value_set":["draft","sent"]} | A claim that every member stays ',
  ],
  [
    "All statuses must be listed among draft, sent trailing words",
    '0.84 | one of draft, sent trailing words | {"subject_key":"statuse","property_key":"allowed_values","operator":"subset_of","value_type":"set","value_set":["draft","sent trailing words"]} | A claim that every member stays ',
  ],
  ["Note: All statuses must be listed among draft, sent", "null"],
  ["Any status must be one of draft", "null"],
  ["Any  status  must  be  one  of  draft", "null"],
  ["Any status must be one of draft trailing words", "null"],
  ["Note: Any status must be one of draft", "null"],
  [
    "The service must never use eval.",
    '0.84 | never use eval | {"subject_key":"the.service","property_key":"uses","operator":"excludes","value_type":"set","value_set":["eval"]} | Something the code must never us',
  ],
  [
    "The  service  must  never  use  eval",
    '0.84 | never use eval | {"subject_key":"the.service","property_key":"uses","operator":"excludes","value_type":"set","value_set":["eval"]} | Something the code must never us',
  ],
  ["The service must never use eval trailing words", "null"],
  [
    "Note: The service must never use eval.",
    '0.84 | never use eval | {"subject_key":"note.the.service","property_key":"uses","operator":"excludes","value_type":"set","value_set":["eval"]} | Something the code must never us',
  ],
  [
    "The service must never import lodash and underscore",
    '0.84 | never import lodash and underscore | {"subject_key":"the.service","property_key":"imports","operator":"excludes","value_type":"set","value_set":["lodash","underscore"]} | Something the code must never us',
  ],
  [
    "The  service  must  never  import  lodash  and  underscore",
    '0.84 | never import lodash  and  underscore | {"subject_key":"the.service","property_key":"imports","operator":"excludes","value_type":"set","value_set":["lodash","underscore"]} | Something the code must never us',
  ],
  [
    "The service must never import lodash and underscore trailing words",
    "null",
  ],
  [
    "Note: The service must never import lodash and underscore",
    '0.84 | never import lodash and underscore | {"subject_key":"note.the.service","property_key":"imports","operator":"excludes","value_type":"set","value_set":["lodash","underscore"]} | Something the code must never us',
  ],
  [
    "The service shall never call process.exit",
    '0.84 | never call process.exit | {"subject_key":"the.service","property_key":"calls","operator":"excludes","value_type":"set","value_set":["process.exit"]} | Something the code must never us',
  ],
  [
    "The  service  shall  never  call  process.exit",
    '0.84 | never call process.exit | {"subject_key":"the.service","property_key":"calls","operator":"excludes","value_type":"set","value_set":["process.exit"]} | Something the code must never us',
  ],
  ["The service shall never call process.exit trailing words", "null"],
  [
    "Note: The service shall never call process.exit",
    '0.84 | never call process.exit | {"subject_key":"note.the.service","property_key":"calls","operator":"excludes","value_type":"set","value_set":["process.exit"]} | Something the code must never us',
  ],
  [
    "The service should never read process.env.SECRET",
    '0.84 | never read process.env.SECRET | {"subject_key":"the.service","property_key":"reads","operator":"excludes","value_type":"set","value_set":["process.env.SECRET"]} | Something the code must never us',
  ],
  [
    "The  service  should  never  read  process.env.SECRET",
    '0.84 | never read process.env.SECRET | {"subject_key":"the.service","property_key":"reads","operator":"excludes","value_type":"set","value_set":["process.env.SECRET"]} | Something the code must never us',
  ],
  ["The service should never read process.env.SECRET trailing words", "null"],
  [
    "Note: The service should never read process.env.SECRET",
    '0.84 | never read process.env.SECRET | {"subject_key":"note.the.service","property_key":"reads","operator":"excludes","value_type":"set","value_set":["process.env.SECRET"]} | Something the code must never us',
  ],
  [
    "The service must never throw strings",
    '0.84 | never throw strings | {"subject_key":"the.service","property_key":"throws","operator":"excludes","value_type":"set","value_set":["strings"]} | Something the code must never us',
  ],
  [
    "The  service  must  never  throw  strings",
    '0.84 | never throw strings | {"subject_key":"the.service","property_key":"throws","operator":"excludes","value_type":"set","value_set":["strings"]} | Something the code must never us',
  ],
  ["The service must never throw strings trailing words", "null"],
  [
    "Note: The service must never throw strings",
    '0.84 | never throw strings | {"subject_key":"note.the.service","property_key":"throws","operator":"excludes","value_type":"set","value_set":["strings"]} | Something the code must never us',
  ],
  ["The service must never use some eval thing", "null"],
  ["The  service  must  never  use  some  eval  thing", "null"],
  ["The service must never use some eval thing trailing words", "null"],
  ["Note: The service must never use some eval thing", "null"],
  [
    "The service must NEVER USE eval",
    '0.84 | never USE eval | {"subject_key":"the.service","property_key":"uses","operator":"excludes","value_type":"set","value_set":["eval"]} | Something the code must never us',
  ],
  [
    "The  service  must  NEVER  USE  eval",
    '0.84 | never USE eval | {"subject_key":"the.service","property_key":"uses","operator":"excludes","value_type":"set","value_set":["eval"]} | Something the code must never us',
  ],
  ["The service must NEVER USE eval trailing words", "null"],
  [
    "Note: The service must NEVER USE eval",
    '0.84 | never USE eval | {"subject_key":"note.the.service","property_key":"uses","operator":"excludes","value_type":"set","value_set":["eval"]} | Something the code must never us',
  ],
  [
    "The plugin list must be exactly the core, http.",
    '0.84 | exactly the core, http | {"subject_key":"the.plugin.list","property_key":"members","operator":"eq","value_type":"set","value_set":["core","http"]} | Members a set must have exactly ',
  ],
  [
    "The  plugin  list  must  be  exactly  the  core,  http",
    '0.84 | exactly the  core,  http | {"subject_key":"the.plugin.list","property_key":"members","operator":"eq","value_type":"set","value_set":["core","http"]} | Members a set must have exactly ',
  ],
  ["The plugin list must be exactly the core, http trailing words", "null"],
  [
    "Note: The plugin list must be exactly the core, http.",
    '0.84 | exactly the core, http | {"subject_key":"note.the.plugin.list","property_key":"members","operator":"eq","value_type":"set","value_set":["core","http"]} | Members a set must have exactly ',
  ],
  [
    "The plugin list must contain exactly the three core, http",
    '0.84 | exactly core, http | {"subject_key":"the.plugin.list","property_key":"members","operator":"eq","value_type":"set","value_set":["core","http"]} | Members a set must have exactly ',
  ],
  [
    "The  plugin  list  must  contain  exactly  the  three  core,  http",
    '0.84 | exactly core,  http | {"subject_key":"the.plugin.list","property_key":"members","operator":"eq","value_type":"set","value_set":["core","http"]} | Members a set must have exactly ',
  ],
  [
    "The plugin list must contain exactly the three core, http trailing words",
    "null",
  ],
  [
    "Note: The plugin list must contain exactly the three core, http",
    '0.84 | exactly core, http | {"subject_key":"note.the.plugin.list","property_key":"members","operator":"eq","value_type":"set","value_set":["core","http"]} | Members a set must have exactly ',
  ],
  [
    "The plugin list must list exactly core",
    '0.84 | exactly core | {"subject_key":"the.plugin.list","property_key":"members","operator":"eq","value_type":"set","value_set":["core"]} | Members a set must have exactly ',
  ],
  [
    "The  plugin  list  must  list  exactly  core",
    '0.84 | exactly core | {"subject_key":"the.plugin.list","property_key":"members","operator":"eq","value_type":"set","value_set":["core"]} | Members a set must have exactly ',
  ],
  ["The plugin list must list exactly core trailing words", "null"],
  [
    "Note: The plugin list must list exactly core",
    '0.84 | exactly core | {"subject_key":"note.the.plugin.list","property_key":"members","operator":"eq","value_type":"set","value_set":["core"]} | Members a set must have exactly ',
  ],
  [
    "The plugin list must declare exactly a b",
    '0.84 | exactly a b | {"subject_key":"the.plugin.list","property_key":"members","operator":"eq","value_type":"set","value_set":["b"]} | Members a set must have exactly ',
  ],
  [
    "The  plugin  list  must  declare  exactly  a  b",
    '0.84 | exactly a  b | {"subject_key":"the.plugin.list","property_key":"members","operator":"eq","value_type":"set","value_set":["b"]} | Members a set must have exactly ',
  ],
  ["The plugin list must declare exactly a b trailing words", "null"],
  [
    "Note: The plugin list must declare exactly a b",
    '0.84 | exactly a b | {"subject_key":"note.the.plugin.list","property_key":"members","operator":"eq","value_type":"set","value_set":["b"]} | Members a set must have exactly ',
  ],
  [
    "The plugin list must have exactly core",
    '0.84 | exactly core | {"subject_key":"the.plugin.list","property_key":"members","operator":"eq","value_type":"set","value_set":["core"]} | Members a set must have exactly ',
  ],
  [
    "The  plugin  list  must  have  exactly  core",
    '0.84 | exactly core | {"subject_key":"the.plugin.list","property_key":"members","operator":"eq","value_type":"set","value_set":["core"]} | Members a set must have exactly ',
  ],
  ["The plugin list must have exactly core trailing words", "null"],
  [
    "Note: The plugin list must have exactly core",
    '0.84 | exactly core | {"subject_key":"note.the.plugin.list","property_key":"members","operator":"eq","value_type":"set","value_set":["core"]} | Members a set must have exactly ',
  ],
  [
    "The plugin list must provide exactly core",
    '0.84 | exactly core | {"subject_key":"the.plugin.list","property_key":"members","operator":"eq","value_type":"set","value_set":["core"]} | Members a set must have exactly ',
  ],
  [
    "The  plugin  list  must  provide  exactly  core",
    '0.84 | exactly core | {"subject_key":"the.plugin.list","property_key":"members","operator":"eq","value_type":"set","value_set":["core"]} | Members a set must have exactly ',
  ],
  ["The plugin list must provide exactly core trailing words", "null"],
  [
    "Note: The plugin list must provide exactly core",
    '0.84 | exactly core | {"subject_key":"note.the.plugin.list","property_key":"members","operator":"eq","value_type":"set","value_set":["core"]} | Members a set must have exactly ',
  ],
  [
    "The config must include at least core, http.",
    '0.84 | at least core, http | {"subject_key":"the.config","property_key":"members","operator":"includes","value_type":"set","value_set":["core","http"]} | Members a set must contain are a',
  ],
  [
    "The  config  must  include  at  least  core,  http",
    '0.84 | at least core,  http | {"subject_key":"the.config","property_key":"members","operator":"includes","value_type":"set","value_set":["core","http"]} | Members a set must contain are a',
  ],
  ["The config must include at least core, http trailing words", "null"],
  [
    "Note: The config must include at least core, http.",
    '0.84 | at least core, http | {"subject_key":"note.the.config","property_key":"members","operator":"includes","value_type":"set","value_set":["core","http"]} | Members a set must contain are a',
  ],
  [
    "The config must always contain at least core",
    '0.84 | at least core | {"subject_key":"the.config","property_key":"members","operator":"includes","value_type":"set","value_set":["core"]} | Members a set must contain are a',
  ],
  [
    "The  config  must  always  contain  at  least  core",
    '0.84 | at least core | {"subject_key":"the.config","property_key":"members","operator":"includes","value_type":"set","value_set":["core"]} | Members a set must contain are a',
  ],
  ["The config must always contain at least core trailing words", "null"],
  [
    "Note: The config must always contain at least core",
    '0.84 | at least core | {"subject_key":"note.the.config","property_key":"members","operator":"includes","value_type":"set","value_set":["core"]} | Members a set must contain are a',
  ],
  [
    "The config must list at least core",
    '0.84 | at least core | {"subject_key":"the.config","property_key":"members","operator":"includes","value_type":"set","value_set":["core"]} | Members a set must contain are a',
  ],
  [
    "The  config  must  list  at  least  core",
    '0.84 | at least core | {"subject_key":"the.config","property_key":"members","operator":"includes","value_type":"set","value_set":["core"]} | Members a set must contain are a',
  ],
  ["The config must list at least core trailing words", "null"],
  [
    "Note: The config must list at least core",
    '0.84 | at least core | {"subject_key":"note.the.config","property_key":"members","operator":"includes","value_type":"set","value_set":["core"]} | Members a set must contain are a',
  ],
  ["The config must declare at least some thing", "null"],
  ["The  config  must  declare  at  least  some  thing", "null"],
  ["The config must declare at least some thing trailing words", "null"],
  ["Note: The config must declare at least some thing", "null"],
  [
    "The invoice status must be one of draft, sent, paid.",
    '0.86 | one of draft, sent, paid | {"subject_key":"the.invoice.status","property_key":"allowed_values","operator":"eq","value_type":"set","value_set":["draft","paid","sent"]} | Allowed enum sets are explicit s',
  ],
  [
    "The  invoice  status  must  be  one  of  draft,  sent,  paid",
    '0.86 | one of draft,  sent,  paid | {"subject_key":"the.invoice.status","property_key":"allowed_values","operator":"eq","value_type":"set","value_set":["draft","paid","sent"]} | Allowed enum sets are explicit s',
  ],
  [
    "The invoice status must be one of draft, sent, paid trailing words",
    '0.86 | one of draft, sent, paid trailing words | {"subject_key":"the.invoice.status","property_key":"allowed_values","operator":"eq","value_type":"set","value_set":["draft","paid trailing words","sent"]} | Allowed enum sets are explicit s',
  ],
  [
    "Note: The invoice status must be one of draft, sent, paid.",
    '0.86 | one of draft, sent, paid | {"subject_key":"note.the.invoice.status","property_key":"allowed_values","operator":"eq","value_type":"set","value_set":["draft","paid","sent"]} | Allowed enum sets are explicit s',
  ],
  ["The invoice status must be one of draft", "null"],
  ["The  invoice  status  must  be  one  of  draft", "null"],
  ["The invoice status must be one of draft trailing words", "null"],
  ["Note: The invoice status must be one of draft", "null"],
  [
    "The invoice transitions must be one of draft -> sent, sent → paid.",
    '0.86 | one of draft -> sent, sent → paid | {"subject_key":"the.invoice","property_key":"transitions","operator":"eq","value_type":"set","value_set":["draft->sent","sent->paid"]} | A state machine\'s transitions or',
  ],
  [
    "The  invoice  transitions  must  be  one  of  draft  ->  sent,  sent  →  paid",
    '0.86 | one of draft  ->  sent,  sent  →  paid | {"subject_key":"the.invoice","property_key":"transitions","operator":"eq","value_type":"set","value_set":["draft->sent","sent->paid"]} | A state machine\'s transitions or',
  ],
  [
    "The invoice transitions must be one of draft -> sent, sent → paid trailing words",
    '0.86 | one of draft -> sent, sent → paid trailing words | {"subject_key":"the.invoice","property_key":"transitions","operator":"eq","value_type":"set","value_set":["draft->sent","sent->paid trailing words"]} | A state machine\'s transitions or',
  ],
  [
    "Note: The invoice transitions must be one of draft -> sent, sent → paid.",
    '0.86 | one of draft -> sent, sent → paid | {"subject_key":"note.the.invoice","property_key":"transitions","operator":"eq","value_type":"set","value_set":["draft->sent","sent->paid"]} | A state machine\'s transitions or',
  ],
  [
    "The invoice transitions must be one of draft, sent",
    '0.86 | one of draft, sent | {"subject_key":"the.invoice.transition","property_key":"allowed_values","operator":"eq","value_type":"set","value_set":["draft","sent"]} | Allowed enum sets are explicit s',
  ],
  [
    "The  invoice  transitions  must  be  one  of  draft,  sent",
    '0.86 | one of draft,  sent | {"subject_key":"the.invoice.transition","property_key":"allowed_values","operator":"eq","value_type":"set","value_set":["draft","sent"]} | Allowed enum sets are explicit s',
  ],
  [
    "The invoice transitions must be one of draft, sent trailing words",
    '0.86 | one of draft, sent trailing words | {"subject_key":"the.invoice.transition","property_key":"allowed_values","operator":"eq","value_type":"set","value_set":["draft","sent trailing words"]} | Allowed enum sets are explicit s',
  ],
  [
    "Note: The invoice transitions must be one of draft, sent",
    '0.86 | one of draft, sent | {"subject_key":"note.the.invoice.transition","property_key":"allowed_values","operator":"eq","value_type":"set","value_set":["draft","sent"]} | Allowed enum sets are explicit s',
  ],
  [
    "The invoice initial states must be one of draft",
    '0.86 | one of draft | {"subject_key":"the.invoice","property_key":"initial_states","operator":"eq","value_type":"set","value_set":["draft"]} | A state machine\'s transitions or',
  ],
  [
    "The  invoice  initial  states  must  be  one  of  draft",
    '0.86 | one of draft | {"subject_key":"the.invoice","property_key":"initial_states","operator":"eq","value_type":"set","value_set":["draft"]} | A state machine\'s transitions or',
  ],
  [
    "The invoice initial states must be one of draft trailing words",
    '0.86 | one of draft trailing words | {"subject_key":"the.invoice","property_key":"initial_states","operator":"eq","value_type":"set","value_set":["draft trailing words"]} | A state machine\'s transitions or',
  ],
  [
    "Note: The invoice initial states must be one of draft",
    '0.86 | one of draft | {"subject_key":"note.the.invoice","property_key":"initial_states","operator":"eq","value_type":"set","value_set":["draft"]} | A state machine\'s transitions or',
  ],
  [
    "The invoice terminal states must be one of paid, void",
    '0.86 | one of paid, void | {"subject_key":"the.invoice","property_key":"terminal_states","operator":"eq","value_type":"set","value_set":["paid","void"]} | A state machine\'s transitions or',
  ],
  [
    "The  invoice  terminal  states  must  be  one  of  paid,  void",
    '0.86 | one of paid,  void | {"subject_key":"the.invoice","property_key":"terminal_states","operator":"eq","value_type":"set","value_set":["paid","void"]} | A state machine\'s transitions or',
  ],
  [
    "The invoice terminal states must be one of paid, void trailing words",
    '0.86 | one of paid, void trailing words | {"subject_key":"the.invoice","property_key":"terminal_states","operator":"eq","value_type":"set","value_set":["paid","void trailing words"]} | A state machine\'s transitions or',
  ],
  [
    "Note: The invoice terminal states must be one of paid, void",
    '0.86 | one of paid, void | {"subject_key":"note.the.invoice","property_key":"terminal_states","operator":"eq","value_type":"set","value_set":["paid","void"]} | A state machine\'s transitions or',
  ],
  [
    "The invoice final states must be one of paid",
    '0.86 | one of paid | {"subject_key":"the.invoice","property_key":"terminal_states","operator":"eq","value_type":"set","value_set":["paid"]} | A state machine\'s transitions or',
  ],
  [
    "The  invoice  final  states  must  be  one  of  paid",
    '0.86 | one of paid | {"subject_key":"the.invoice","property_key":"terminal_states","operator":"eq","value_type":"set","value_set":["paid"]} | A state machine\'s transitions or',
  ],
  [
    "The invoice final states must be one of paid trailing words",
    '0.86 | one of paid trailing words | {"subject_key":"the.invoice","property_key":"terminal_states","operator":"eq","value_type":"set","value_set":["paid trailing words"]} | A state machine\'s transitions or',
  ],
  [
    "Note: The invoice final states must be one of paid",
    '0.86 | one of paid | {"subject_key":"note.the.invoice","property_key":"terminal_states","operator":"eq","value_type":"set","value_set":["paid"]} | A state machine\'s transitions or',
  ],
  [
    "The invoice reachable states must be one of draft, paid",
    '0.86 | one of draft, paid | {"subject_key":"the.invoice","property_key":"reachable_states","operator":"eq","value_type":"set","value_set":["draft","paid"]} | A state machine\'s transitions or',
  ],
  [
    "The  invoice  reachable  states  must  be  one  of  draft,  paid",
    '0.86 | one of draft,  paid | {"subject_key":"the.invoice","property_key":"reachable_states","operator":"eq","value_type":"set","value_set":["draft","paid"]} | A state machine\'s transitions or',
  ],
  [
    "The invoice reachable states must be one of draft, paid trailing words",
    '0.86 | one of draft, paid trailing words | {"subject_key":"the.invoice","property_key":"reachable_states","operator":"eq","value_type":"set","value_set":["draft","paid trailing words"]} | A state machine\'s transitions or',
  ],
  [
    "Note: The invoice reachable states must be one of draft, paid",
    '0.86 | one of draft, paid | {"subject_key":"note.the.invoice","property_key":"reachable_states","operator":"eq","value_type":"set","value_set":["draft","paid"]} | A state machine\'s transitions or',
  ],
  [
    "The invoice Final  States must be one of paid",
    '0.86 | one of paid | {"subject_key":"the.invoice","property_key":"terminal_states","operator":"eq","value_type":"set","value_set":["paid"]} | A state machine\'s transitions or',
  ],
  [
    "The  invoice  Final    States  must  be  one  of  paid",
    '0.86 | one of paid | {"subject_key":"the.invoice","property_key":"terminal_states","operator":"eq","value_type":"set","value_set":["paid"]} | A state machine\'s transitions or',
  ],
  [
    "The invoice Final  States must be one of paid trailing words",
    '0.86 | one of paid trailing words | {"subject_key":"the.invoice","property_key":"terminal_states","operator":"eq","value_type":"set","value_set":["paid trailing words"]} | A state machine\'s transitions or',
  ],
  [
    "Note: The invoice Final  States must be one of paid",
    '0.86 | one of paid | {"subject_key":"note.the.invoice","property_key":"terminal_states","operator":"eq","value_type":"set","value_set":["paid"]} | A state machine\'s transitions or',
  ],
  [
    "The cart must hold at most 5 items.",
    '0.9 | at most 5 | {"subject_key":"items","property_key":"count","operator":"lte","value_type":"int","value_int":5} | Bounded cardinality is a strict ',
  ],
  [
    "The  cart  must  hold  at  most  5  items",
    '0.9 | at  most 5 | {"subject_key":"items","property_key":"count","operator":"lte","value_type":"int","value_int":5} | Bounded cardinality is a strict ',
  ],
  [
    "The cart must hold at most 5 items trailing words",
    '0.9 | at most 5 | {"subject_key":"items.trailing.words","property_key":"count","operator":"lte","value_type":"int","value_int":5} | Bounded cardinality is a strict ',
  ],
  [
    "Note: The cart must hold at most 5 items.",
    '0.9 | at most 5 | {"subject_key":"items","property_key":"count","operator":"lte","value_type":"int","value_int":5} | Bounded cardinality is a strict ',
  ],
  ["Nothing to see here.", "null"],
  ["Nothing  to  see  here", "null"],
  ["Nothing to see here trailing words", "null"],
  ["Note: Nothing to see here.", "null"],
  ["Every route under /x must use ,", "null"],
  ["Every  route  under  /x  must  use  ,", "null"],
  ["Every route under /x must use , trailing words", "null"],
  ["Note: Every route under /x must use ,", "null"],
  ["Every route under /x must use auth and some thing", "null"],
  ["Every  route  under  /x  must  use  auth  and  some  thing", "null"],
  ["Every route under /x must use auth and some thing trailing words", "null"],
  ["Note: Every route under /x must use auth and some thing", "null"],
  [
    "Every route under /x must use the `auth`",
    '0.84 | under /x ... `auth` | {"subject_key":"route.x","property_key":"middleware","operator":"includes","value_type":"set","value_set":["auth"]} | Middleware every route under a p',
  ],
  [
    "Every  route  under  /x  must  use  the  `auth`",
    '0.84 | under /x ... `auth` | {"subject_key":"route.x","property_key":"middleware","operator":"includes","value_type":"set","value_set":["auth"]} | Middleware every route under a p',
  ],
  ["Every route under /x must use the `auth` trailing words", "null"],
  ["Note: Every route under /x must use the `auth`", "null"],
  [
    "Every route under /x must use auth, auth",
    '0.84 | under /x ... auth, auth | {"subject_key":"route.x","property_key":"middleware","operator":"includes","value_type":"set","value_set":["auth"]} | Middleware every route under a p',
  ],
  [
    "Every  route  under  /x  must  use  auth,  auth",
    '0.84 | under /x ... auth,  auth | {"subject_key":"route.x","property_key":"middleware","operator":"includes","value_type":"set","value_set":["auth"]} | Middleware every route under a p',
  ],
  ["Every route under /x must use auth, auth trailing words", "null"],
  ["Note: Every route under /x must use auth, auth", "null"],
  ["Every table must have ,", "null"],
  ["Every  table  must  have  ,", "null"],
  ["Every table must have , trailing words", "null"],
  ["Note: Every table must have ,", "null"],
  ["Every table must have id and 9x", "null"],
  ["Every  table  must  have  id  and  9x", "null"],
  ["Every table must have id and 9x trailing words", "null"],
  ["Note: Every table must have id and 9x", "null"],
  ["The id column of users must be nullable and ,", "null"],
  ["The  id  column  of  users  must  be  nullable  and  ,", "null"],
  ["The id column of users must be nullable and , trailing words", "null"],
  ["Note: The id column of users must be nullable and ,", "null"],
  ["The id, 9x columns of users must be nullable", "null"],
  ["The  id,  9x  columns  of  users  must  be  nullable", "null"],
  ["The id, 9x columns of users must be nullable trailing words", "null"],
  ["Note: The id, 9x columns of users must be nullable", "null"],
  ["The , column of users must be nullable", "null"],
  ["The  ,  column  of  users  must  be  nullable", "null"],
  ["The , column of users must be nullable trailing words", "null"],
  ["Note: The , column of users must be nullable", "null"],
  ["Each status must be one of ,", "null"],
  ["Each  status  must  be  one  of  ,", "null"],
  ["Each status must be one of , trailing words", "null"],
  ["Note: Each status must be one of ,", "null"],
  [
    "Each status must be one of a, a",
    '0.86 | one of a, a | {"subject_key":"each.status","property_key":"allowed_values","operator":"eq","value_type":"set","value_set":["a"]} | Allowed enum sets are explicit s',
  ],
  [
    "Each  status  must  be  one  of  a,  a",
    '0.86 | one of a,  a | {"subject_key":"each.status","property_key":"allowed_values","operator":"eq","value_type":"set","value_set":["a"]} | Allowed enum sets are explicit s',
  ],
  [
    "Each status must be one of a, a trailing words",
    '0.84 | one of a, a trailing words | {"subject_key":"status","property_key":"allowed_values","operator":"subset_of","value_type":"set","value_set":["a","trailing words"]} | A claim that every member stays ',
  ],
  [
    "Note: Each status must be one of a, a",
    '0.86 | one of a, a | {"subject_key":"note.each.status","property_key":"allowed_values","operator":"eq","value_type":"set","value_set":["a"]} | Allowed enum sets are explicit s',
  ],
  ["The service must never use ,", "null"],
  ["The  service  must  never  use  ,", "null"],
  ["The service must never use , trailing words", "null"],
  ["Note: The service must never use ,", "null"],
  ["The service must never use eval and some thing", "null"],
  ["The  service  must  never  use  eval  and  some  thing", "null"],
  ["The service must never use eval and some thing trailing words", "null"],
  ["Note: The service must never use eval and some thing", "null"],
  ["The plugin list must be exactly ,", "null"],
  ["The  plugin  list  must  be  exactly  ,", "null"],
  ["The plugin list must be exactly , trailing words", "null"],
  ["Note: The plugin list must be exactly ,", "null"],
  ["The plugin list must be exactly core and some thing", "null"],
  ["The  plugin  list  must  be  exactly  core  and  some  thing", "null"],
  [
    "The plugin list must be exactly core and some thing trailing words",
    "null",
  ],
  ["Note: The plugin list must be exactly core and some thing", "null"],
  ["The config must include at least ,", "null"],
  ["The  config  must  include  at  least  ,", "null"],
  ["The config must include at least , trailing words", "null"],
  ["Note: The config must include at least ,", "null"],
  ["The config must include at least core and some thing", "null"],
  ["The  config  must  include  at  least  core  and  some  thing", "null"],
  [
    "The config must include at least core and some thing trailing words",
    "null",
  ],
  ["Note: The config must include at least core and some thing", "null"],
  ["The invoice transitions must be one of ,", "null"],
  ["The  invoice  transitions  must  be  one  of  ,", "null"],
  ["The invoice transitions must be one of , trailing words", "null"],
  ["Note: The invoice transitions must be one of ,", "null"],
  [
    "The invoice transitions must be one of a -> b, c",
    '0.86 | one of a -> b, c | {"subject_key":"the.invoice.transition","property_key":"allowed_values","operator":"eq","value_type":"set","value_set":["a -> b","c"]} | Allowed enum sets are explicit s',
  ],
  [
    "The  invoice  transitions  must  be  one  of  a  ->  b,  c",
    '0.86 | one of a  ->  b,  c | {"subject_key":"the.invoice.transition","property_key":"allowed_values","operator":"eq","value_type":"set","value_set":["a  ->  b","c"]} | Allowed enum sets are explicit s',
  ],
  [
    "The invoice transitions must be one of a -> b, c trailing words",
    '0.86 | one of a -> b, c trailing words | {"subject_key":"the.invoice.transition","property_key":"allowed_values","operator":"eq","value_type":"set","value_set":["a -> b","c trailing words"]} | Allowed enum sets are explicit s',
  ],
  [
    "Note: The invoice transitions must be one of a -> b, c",
    '0.86 | one of a -> b, c | {"subject_key":"note.the.invoice.transition","property_key":"allowed_values","operator":"eq","value_type":"set","value_set":["a -> b","c"]} | Allowed enum sets are explicit s',
  ],
  [
    "The invoice transitions must be one of a->b, a -> b",
    '0.86 | one of a->b, a -> b | {"subject_key":"the.invoice","property_key":"transitions","operator":"eq","value_type":"set","value_set":["a->b"]} | A state machine\'s transitions or',
  ],
  [
    "The  invoice  transitions  must  be  one  of  a->b,  a  ->  b",
    '0.86 | one of a->b,  a  ->  b | {"subject_key":"the.invoice","property_key":"transitions","operator":"eq","value_type":"set","value_set":["a->b"]} | A state machine\'s transitions or',
  ],
  [
    "The invoice transitions must be one of a->b, a -> b trailing words",
    '0.86 | one of a->b, a -> b trailing words | {"subject_key":"the.invoice","property_key":"transitions","operator":"eq","value_type":"set","value_set":["a->b","a->b trailing words"]} | A state machine\'s transitions or',
  ],
  [
    "Note: The invoice transitions must be one of a->b, a -> b",
    '0.86 | one of a->b, a -> b | {"subject_key":"note.the.invoice","property_key":"transitions","operator":"eq","value_type":"set","value_set":["a->b"]} | A state machine\'s transitions or',
  ],
  [
    "The invoice states must be one of a, b",
    '0.86 | one of a, b | {"subject_key":"the.invoice.state","property_key":"allowed_values","operator":"eq","value_type":"set","value_set":["a","b"]} | Allowed enum sets are explicit s',
  ],
  [
    "The  invoice  states  must  be  one  of  a,  b",
    '0.86 | one of a,  b | {"subject_key":"the.invoice.state","property_key":"allowed_values","operator":"eq","value_type":"set","value_set":["a","b"]} | Allowed enum sets are explicit s',
  ],
  [
    "The invoice states must be one of a, b trailing words",
    '0.86 | one of a, b trailing words | {"subject_key":"the.invoice.state","property_key":"allowed_values","operator":"eq","value_type":"set","value_set":["a","b trailing words"]} | Allowed enum sets are explicit s',
  ],
  [
    "Note: The invoice states must be one of a, b",
    '0.86 | one of a, b | {"subject_key":"note.the.invoice.state","property_key":"allowed_values","operator":"eq","value_type":"set","value_set":["a","b"]} | Allowed enum sets are explicit s',
  ],
  ["All currencies in , must fail closed", "null"],
  ["All  currencies  in  ,  must  fail  closed", "null"],
  ["All currencies in , must fail closed trailing words", "null"],
  ["Note: All currencies in , must fail closed", "null"],
  [
    "Every route under /x must use `auth` and the rateLimit and an x nor y or z",
    '0.84 | under /x ... `auth` and the rateLimit and an x nor y or z | {"subject_key":"route.x","property_key":"middleware","operator":"includes","value_type":"set","value_set":["auth","rateLimit","x","y","z"]} | Middleware every route under a p',
  ],
  [
    "Every  route  under  /x  must  use  `auth`  and  the  rateLimit  and  an  x  nor  y  or  z",
    '0.84 | under /x ... `auth`  and  the  rateLimit  and  an  x  nor  y  or  z | {"subject_key":"route.x","property_key":"middleware","operator":"includes","value_type":"set","value_set":["auth","rateLimit","x","y","z"]} | Middleware every route under a p',
  ],
  [
    "Every route under /x must use `auth` and the rateLimit and an x nor y or z trailing words",
    "null",
  ],
  [
    "Note: Every route under /x must use `auth` and the rateLimit and an x nor y or z",
    "null",
  ],
  [
    "Every route under /x must use the  auth",
    '0.84 | under /x ... auth | {"subject_key":"route.x","property_key":"middleware","operator":"includes","value_type":"set","value_set":["auth"]} | Middleware every route under a p',
  ],
  [
    "Every  route  under  /x  must  use  the    auth",
    '0.84 | under /x ... auth | {"subject_key":"route.x","property_key":"middleware","operator":"includes","value_type":"set","value_set":["auth"]} | Middleware every route under a p',
  ],
  ["Every route under /x must use the  auth trailing words", "null"],
  ["Note: Every route under /x must use the  auth", "null"],
  [
    "Every route under /x must use thee",
    '0.84 | under /x ... thee | {"subject_key":"route.x","property_key":"middleware","operator":"includes","value_type":"set","value_set":["thee"]} | Middleware every route under a p',
  ],
  [
    "Every  route  under  /x  must  use  thee",
    '0.84 | under /x ... thee | {"subject_key":"route.x","property_key":"middleware","operator":"includes","value_type":"set","value_set":["thee"]} | Middleware every route under a p',
  ],
  ["Every route under /x must use thee trailing words", "null"],
  ["Note: Every route under /x must use thee", "null"],
  ["Every route under /x must use `a`b`", "null"],
  ["Every  route  under  /x  must  use  `a`b`", "null"],
  ["Every route under /x must use `a`b` trailing words", "null"],
  ["Note: Every route under /x must use `a`b`", "null"],
  [
    "The code must match /a/b/",
    '0.86 | match a/b | {"subject_key":"the.code","property_key":"format","operator":"matches","value_type":"string","value_string":"a/b"} | A required format is a string fa',
  ],
  [
    "The  code  must  match  /a/b/",
    '0.86 | match a/b | {"subject_key":"the.code","property_key":"format","operator":"matches","value_type":"string","value_string":"a/b"} | A required format is a string fa',
  ],
  ["The code must match /a/b/ trailing words", "null"],
  [
    "Note: The code must match /a/b/",
    '0.86 | match a/b | {"subject_key":"note.the.code","property_key":"format","operator":"matches","value_type":"string","value_string":"a/b"} | A required format is a string fa',
  ],
  ["Dark mode must be enabled..", "null"],
  ["Note: Dark mode must be enabled..", "null"],
  [
    "An draft can never become sent",
    '0.86 | draft ... never ... sent | {"subject_key":"workflow","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["draft->sent"]} | A state that can never reach ano',
  ],
  [
    "An  draft  can  never  become  sent",
    '0.86 | draft ... never ... sent | {"subject_key":"workflow","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["draft->sent"]} | A state that can never reach ano',
  ],
  ["An draft can never become sent trailing words", "null"],
  ["Note: An draft can never become sent", "null"],
  [
    "Then draft can never become sent",
    '0.86 | Then ... never ... sent | {"subject_key":"draft","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["then->sent"]} | A state that can never reach ano',
  ],
  [
    "Then  draft  can  never  become  sent",
    '0.86 | Then ... never ... sent | {"subject_key":"draft","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["then->sent"]} | A state that can never reach ano',
  ],
  ["Then draft can never become sent trailing words", "null"],
  ["Note: Then draft can never become sent", "null"],
  ["Note\nSession tokens expire after 30 days.", "null"],
  ["Note\nSession tokens expires after 1 day", "null"],
  ["Note\nSession tokens EXPIRE after 2 Hours", "null"],
  ["Note\nTokens expire after 5 minutes", "null"],
  ["Note\nTokens expire after 5 minute", "null"],
  ["Note\nTokens expire after 3 months", "null"],
  ["Note\nTokens expire after 3 years", "null"],
  ["Note\nTokens expire after 3 weeks", "null"],
  ["Note\nTokens expire after soon", "null"],
  ["Note\nThe cart total must be less than 100.", "null"],
  ["Note\nThe cart total must be greater than 1", "null"],
  ["Note\nThe cart total shall be below 9", "null"],
  ["Note\nThe cart total should be above 9", "null"],
  ["Note\nThe cart total must be minimum 2", "null"],
  ["Note\nThe cart total must be maximum 2", "null"],
  ["Note\nThe cart total must be at least 2", "null"],
  ["Note\nThe cart total must be at most 2", "null"],
  ["Note\nThe cart total must be AT  LEAST 2", "null"],
  ["Note\nThe cart total must be about 2", "null"],
  [
    "Note\nSlots must normalize into canonical integer decisecond slot values.",
    "null",
  ],
  [
    "Note\nSlots must normalize into canonical integer decisecond Slot value",
    "null",
  ],
  [
    "Note\nSlots must normalize into canonical integer decisecond 9slot values",
    "null",
  ],
  ["Note\nThe API must return within 200 ms.", "null"],
  ["Note\nThe API must return within 2 milliseconds", "null"],
  ["Note\nThe API must return within 2 millisecond", "null"],
  ["Note\nThe API must return within 2 s", "null"],
  ["Note\nThe API must return within 2 sec", "null"],
  ["Note\nThe API must return within 2 secs", "null"],
  ["Note\nThe API must return within 2 seconds", "null"],
  ["Note\nThe API must return within 2 Seconds", "null"],
  ["Note\nThe API must return within 2 MS", "null"],
  ["Note\nThe API must return within 2 hours", "null"],
  ["Note\nDark mode must be enabled.", "null"],
  ["Note\nDark mode must be Disabled", "null"],
  ["Note\nDark mode must be ENABLED", "null"],
  ["Note\nAudit logs must be retained for 7 years.", "null"],
  ["Note\nAudit logs must be retained for 1 day", "null"],
  ["Note\nAudit logs must be retained for 2 Months", "null"],
  ["Note\nAudit logs must be retained for 2 weeks", "null"],
  ["Note\nEvery currency in GBP, ILS and ZAR must fail closed.", "null"],
  ["Note\nEvery currency in GBP or ZAR or GBP must fail closed", "null"],
  ["Note\nEach currency in GBP must fail closed", "null"],
  ["Note\nAll currencies in GBP and ZAR must !!!", "null"],
  [
    "Note\nAll currencies in GBP and ZAR must one two three four five six seven eight",
    "null",
  ],
  ["Note\nThe code must match `^[A-Z]{3}$`.", "null"],
  ["Note\nThe code must always match the pattern `x+`", "null"],
  ["Note\nThe code must match the regular expression /a|b/", "null"],
  ["Note\nThe code must match the regex /a/.", "null"],
  ["Note\nThe code must match ``", "null"],
  ["Note\nThe code must match //", "null"],
  ["Note\nThe code must be `EUR`.", "null"],
  ["Note\nThe code must always be `EUR`", "null"],
  ["Note\nThe code must be ``", "null"],
  [
    "Note\nA draft can never become sent.",
    '0.86 | Note ... never ... sent | {"subject_key":"a.draft","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["note->sent"]} | A state that can never reach ano',
  ],
  [
    "Note\nThe draft invoice can never become paid",
    '0.86 | Note ... never ... paid | {"subject_key":"the.draft.invoice","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["note->paid"]} | A state that can never reach ano',
  ],
  [
    "Note\ndraft may never go back to new",
    '0.86 | Note ... never ... new | {"subject_key":"draft","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["note->new"]} | A state that can never reach ano',
  ],
  [
    "Note\ndraft must never transition to new",
    '0.86 | Note ... never ... new | {"subject_key":"draft","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["note->new"]} | A state that can never reach ano',
  ],
  [
    "Note\ndraft shall never move to new",
    '0.86 | Note ... never ... new | {"subject_key":"draft","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["note->new"]} | A state that can never reach ano',
  ],
  [
    "Note\ndraft should never reach new.",
    '0.86 | Note ... never ... new | {"subject_key":"draft","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["note->new"]} | A state that can never reach ano',
  ],
  [
    "Note\nDraft invoice order can never go to Paid",
    '0.86 | Note ... never ... Paid | {"subject_key":"draft.invoice.order","property_key":"reachable_pairs","operator":"excludes","value_type":"set","value_set":["note->paid"]} | A state that can never reach ano',
  ],
  [
    "Note\nIn the billing flow, every path from draft to paid must pass through approved.",
    "null",
  ],
  [
    "Note\nIn a flow, each path from draft to paid should go through approved",
    "null",
  ],
  ["Note\nAny path from draft to paid shall pass through approved", "null"],
  [
    "Note\nIn billing, every path from draft to paid must pass through approved",
    "null",
  ],
  ["Note\nEvery route under /admin must use auth.", "null"],
  [
    "Note\nEach endpoint below `/api/v1` should be protected by the auth and rateLimit middleware",
    "null",
  ],
  ["Note\nAll handlers in /x must run @scope/pkg", "null"],
  [
    "Note\nAll routes under /x must go through node:fs/promises, ./local",
    "null",
  ],
  ["Note\nEvery route under /x must be guarded by auth", "null"],
  ["Note\nEvery route under /x must apply auth middleware.", "null"],
  ["Note\nEvery route under /x must use the auth middleware.", "null"],
  ["Note\nEvery route under /x must use some auth thing", "null"],
  ["Note\nEvery route under x must use auth", "null"],
  ["Note\nEvery table must have id.", "null"],
  ["Note\nEvery table must have the field owner_id", "null"],
  ["Note\nEach organization must have the field owner_id", "null"],
  ["Note\nEach organization must have an owner_id column", "null"],
  ["Note\nEach organization must have an owner", "null"],
  ["Note\nAll objects must include the required fields id and name.", "null"],
  ["Note\nEvery object must declare a non-null property id", "null"],
  ["Note\nEvery object must contain id as required fields", "null"],
  ["Note\nEvery user must have id, name as non-null columns", "null"],
  ["Note\nEvery request body must define properties id", "null"],
  ["Note\nEvery response body must have id", "null"],
  ["Note\nEvery schema must have 9id", "null"],
  ["Note\nEvery entity must have id", "null"],
  ["Note\nEvery entities must have id", "null"],
  ["Note\nEvery payload must have id", "null"],
  ["Note\nEvery dto must have id", "null"],
  ["Note\nEvery interface must have id", "null"],
  ["Note\nEvery model must have id", "null"],
  ["Note\nEvery record must have id", "null"],
  ["Note\nEvery row must have id", "null"],
  ["Note\nEvery type must have id", "null"],
  ["Note\nThe deleted_at column of the users table must be nullable.", "null"],
  ["Note\ndeleted_at fields in users must be optional null", "null"],
  ["Note\nThe deleted_at property on users should be nullable", "null"],
  ["Note\nThe deleted at column of users must be nullable", "null"],
  ["Note\nEvery status must be one of draft, sent or paid.", "null"],
  ["Note\nEach status must be declared in draft and sent", "null"],
  ["Note\nAll statuses must be listed among draft, sent", "null"],
  ["Note\nAny status must be one of draft", "null"],
  ["Note\nThe service must never use eval.", "null"],
  ["Note\nThe service must never import lodash and underscore", "null"],
  ["Note\nThe service shall never call process.exit", "null"],
  ["Note\nThe service should never read process.env.SECRET", "null"],
  ["Note\nThe service must never throw strings", "null"],
  ["Note\nThe service must never use some eval thing", "null"],
  ["Note\nThe service must NEVER USE eval", "null"],
  ["Note\nThe plugin list must be exactly the core, http.", "null"],
  ["Note\nThe plugin list must contain exactly the three core, http", "null"],
  ["Note\nThe plugin list must list exactly core", "null"],
  ["Note\nThe plugin list must declare exactly a b", "null"],
  ["Note\nThe plugin list must have exactly core", "null"],
  ["Note\nThe plugin list must provide exactly core", "null"],
  ["Note\nThe config must include at least core, http.", "null"],
  ["Note\nThe config must always contain at least core", "null"],
  ["Note\nThe config must list at least core", "null"],
  ["Note\nThe config must declare at least some thing", "null"],
  ["Note\nThe invoice status must be one of draft, sent, paid.", "null"],
  ["Note\nThe invoice status must be one of draft", "null"],
  [
    "Note\nThe invoice transitions must be one of draft -> sent, sent → paid.",
    "null",
  ],
  ["Note\nThe invoice transitions must be one of draft, sent", "null"],
  ["Note\nThe invoice initial states must be one of draft", "null"],
  ["Note\nThe invoice terminal states must be one of paid, void", "null"],
  ["Note\nThe invoice final states must be one of paid", "null"],
  ["Note\nThe invoice reachable states must be one of draft, paid", "null"],
  ["Note\nThe invoice Final  States must be one of paid", "null"],
  [
    "Note\nThe cart must hold at most 5 items.",
    '0.9 | at most 5 | {"subject_key":"items","property_key":"count","operator":"lte","value_type":"int","value_int":5} | Bounded cardinality is a strict ',
  ],
  ["Note\nNothing to see here.", "null"],
  [
    "Tokens expire after 1 month",
    '0.88 | expire after 1 month | {"subject_key":"token","property_key":"expiry_months","operator":"eq","value_type":"int","value_int":1,"unit":"months"} | Expiry duration is a scalar stri',
  ],
  [
    "Tokens expire after 1 year",
    '0.88 | expire after 1 year | {"subject_key":"token","property_key":"expiry_years","operator":"eq","value_type":"int","value_int":1,"unit":"years"} | Expiry duration is a scalar stri',
  ],
  [
    "Tokens expire after 1 hour",
    '0.88 | expire after 1 hour | {"subject_key":"token","property_key":"expiry_hours","operator":"eq","value_type":"int","value_int":1,"unit":"hours"} | Expiry duration is a scalar stri',
  ],
  [
    "Audit logs must be retained for 1 month",
    '0.92 | retained for 1 month | {"subject_key":"audit.log","property_key":"retention_months","operator":"eq","value_type":"int","value_int":1,"unit":"months"} | Retention duration is a scalar s',
  ],
  [
    "Audit logs must be retained for 1 year",
    '0.92 | retained for 1 year | {"subject_key":"audit.log","property_key":"retention_years","operator":"eq","value_type":"int","value_int":1,"unit":"years"} | Retention duration is a scalar s',
  ],
  [
    "Audit logs must be retained for 10 years",
    '0.92 | retained for 10 years | {"subject_key":"audit.log","property_key":"retention_years","operator":"eq","value_type":"int","value_int":10,"unit":"years"} | Retention duration is a scalar s',
  ],
  [
    "The API must return within 1 second",
    '0.88 | within 1 second | {"subject_key":"the.api","property_key":"latency_seconds","operator":"lte","value_type":"int","value_int":1,"unit":"seconds"} | Response-time thresholds are bou',
  ],
  [
    "Each status must be one of draft the sent, paid",
    '0.84 | one of draft the sent, paid | {"subject_key":"status","property_key":"allowed_values","operator":"subset_of","value_type":"set","value_set":["draft the sent","paid"]} | A claim that every member stays ',
  ],
  [
    "Every object must have id",
    '0.84 | have id | {"subject_key":"object","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  [
    "Every schema must have id",
    '0.84 | have id | {"subject_key":"schema","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  [
    "Every request  body must have id",
    '0.84 | have id | {"subject_key":"request.body","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  [
    "Every request body must have id",
    '0.84 | have id | {"subject_key":"request.body","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["id"]} | Fields every table or object mus',
  ],
  ["Every requestxbody must have id", "null"],
  [
    "Every handler under /x must use auth",
    '0.84 | under /x ... auth | {"subject_key":"route.x","property_key":"middleware","operator":"includes","value_type":"set","value_set":["auth"]} | Middleware every route under a p',
  ],
  [
    "Every currency in ZAR, GBP must fail closed",
    '0.84 | in ZAR, GBP | {"subject_key":"currency","property_key":"fail_closed","operator":"includes","value_type":"set","value_set":["GBP","ZAR"]} | A claim that every member of a c',
  ],
  [
    "The invoice transitions must be one of b -> c, a -> b",
    '0.86 | one of b -> c, a -> b | {"subject_key":"the.invoice","property_key":"transitions","operator":"eq","value_type":"set","value_set":["a->b","b->c"]} | A state machine\'s transitions or',
  ],
  [
    "The invoice transitions log must be one of a -> b, c -> d",
    '0.86 | one of a -> b, c -> d | {"subject_key":"the.invoice.transition.log","property_key":"allowed_values","operator":"eq","value_type":"set","value_set":["a -> b","c -> d"]} | Allowed enum sets are explicit s',
  ],
  [
    "The invoice initial states log must be one of a, b",
    '0.86 | one of a, b | {"subject_key":"the.invoice.initial.state.log","property_key":"allowed_values","operator":"eq","value_type":"set","value_set":["a","b"]} | Allowed enum sets are explicit s',
  ],
  [
    "The service must never use ./local",
    '0.84 | never use ./local | {"subject_key":"the.service","property_key":"uses","operator":"excludes","value_type":"set","value_set":["./local"]} | Something the code must never us',
  ],
  [
    "The service must never use ../up",
    '0.84 | never use ../up | {"subject_key":"the.service","property_key":"uses","operator":"excludes","value_type":"set","value_set":["../up"]} | Something the code must never us',
  ],
  [
    "The service must never use .env",
    '0.84 | never use .env | {"subject_key":"the.service","property_key":"uses","operator":"excludes","value_type":"set","value_set":[".env"]} | Something the code must never us',
  ],
  ["The service must never use /abs", "null"],
  [
    "Each organization must have the column owner_id",
    '0.84 | have owner_id | {"subject_key":"organization","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["owner_id"]} | Fields every table or object mus',
  ],
  [
    "Each organization must have owner_id field",
    '0.84 | have owner_id | {"subject_key":"organization","property_key":"required_fields","operator":"includes","value_type":"set","value_set":["owner_id"]} | Fields every table or object mus',
  ],
];

describe("detectStrictSuggestion readings", () => {
  for (const [statement, expected] of READINGS)
    test(JSON.stringify(statement), () => {
      expect(reading(statement)).toBe(expected);
    });
});

describe("detectStrictSuggestion results", () => {
  test("builds the strict suggestion from the payload", () => {
    const payload = {
      id: "REQ-1",
      properties: { semantic_text: "Dark mode must be enabled." },
    };
    expect(
      detectStrictSuggestion(payload, "Dark mode must be enabled."),
    ).toStrictEqual(
      strictSuggestion(
        payload,
        "be enabled",
        {
          subject_key: "dark.mode",
          property_key: "enabled",
          operator: "eq",
          value_type: "bool",
          value_bool: true,
        },
        "Enabled/disabled requirements are boolean properties and can participate in strict checks.",
        0.88,
      ),
    );
  });

  test("source shapes are detected on their own", () => {
    expect(detectSourceShape({}, "Dark mode must be enabled.")).toBe(null);
    expect(
      detectSourceShape({}, "The service must never use eval.")?.evidence,
    ).toBe("never use eval");
  });
});
