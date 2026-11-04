import { describe, expect, test } from "bun:test";
import type { LogicTerm } from "../../../src/logic/ir.js";
import { detectConditionalRule } from "../../../src/operations/semantic-advisor/conditional-rules.js";

const term = (t: LogicTerm): string => {
  if (t.kind === "number") return String(t.value);
  if (t.kind === "duration") return `${t.value}${t.unit}`;
  return `'${(t as { value: unknown }).value}'`;
};

/** One line per reading: the rule it becomes, or why it stays unparsed. */
function reading(statement: string): string {
  const match = detectConditionalRule(statement);
  if (match === null) return "null";
  if (match.kind === "unparsed")
    return `unparsed ${match.shape}: ${match.reason.split(" ").slice(0, 6).join(" ")}`;
  const exception = match.ir.exceptions?.[0] as {
    operator: string;
    right: LogicTerm;
  };
  const valueType = (match.ir.variables?.[1] as { type: string }).type;
  return `${match.shape} ${match.scope ?? "-"} ${match.action} :- ${match.subjectKey}.${match.propertyKey} unless ${exception.operator} ${term(exception.right)} (${valueType})`;
}

const READINGS: ReadonlyArray<readonly [string, string]> = [
  [
    "Checkout may happen only when the cart total is positive.",
    "only_when - checkout :- cart.total unless gt 0 (number)",
  ],
  [
    "Checkout can only happen if the cart total is positive",
    "only_when - checkout :- cart.total unless gt 0 (number)",
  ],
  [
    "Checkout must happen only when the cart total is positive!",
    "only_when - checkout :- cart.total unless gt 0 (number)",
  ],
  [
    "Checkout shall only proceed when the cart total is positive",
    "only_when - checkout :- cart.total unless gt 0 (number)",
  ],
  [
    "Checkout should occur only if the cart total is positive",
    "only_when - checkout :- cart.total unless gt 0 (number)",
  ],
  [
    "Orders cannot be placed unless the cart total is positive.",
    "unless - orders :- cart.total unless gt 0 (number)",
  ],
  [
    "Orders can't be shipped unless the cart total is positive.",
    "unless - orders_shipped :- cart.total unless gt 0 (number)",
  ],
  [
    "Orders must not ship unless the cart total is positive.",
    "unless - orders_ship :- cart.total unless gt 0 (number)",
  ],
  [
    "Orders must never ship unless the cart total is positive.",
    "unless - orders_ship :- cart.total unless gt 0 (number)",
  ],
  [
    "Orders shall never ship unless the cart total is positive.",
    "unless - orders_ship :- cart.total unless gt 0 (number)",
  ],
  [
    "Orders may not ship unless the cart total is positive.",
    "unless - orders_ship :- cart.total unless gt 0 (number)",
  ],
  [
    "Orders should not ship unless the cart total is positive.",
    "unless - orders_ship :- cart.total unless gt 0 (number)",
  ],
  [
    "Orders shall not ship unless the cart total is positive.",
    "unless - orders_ship :- cart.total unless gt 0 (number)",
  ],
  [
    "Orders can not ship unless the cart total is positive.",
    "unless - orders_ship :- cart.total unless gt 0 (number)",
  ],
  [
    "In the EU, refunds may happen only when the order status is approved.",
    "only_when eu refunds :- order.status unless eq 'approved' (string)",
  ],
  [
    "For EU orders, refunds may happen only when the order status is approved.",
    "only_when eu refunds :- order.status unless eq 'approved' (string)",
  ],
  [
    "Within US, refunds may happen only when the order status is approved.",
    "only_when us refunds :- order.status unless eq 'approved' (string)",
  ],
  [
    "in EU, refunds may happen only when the order status is approved.",
    "only_when eu refunds :- order.status unless eq 'approved' (string)",
  ],
  [
    "In Eu, refunds may happen only when the order status is approved.",
    "only_when - in_eu_refunds :- order.status unless eq 'approved' (string)",
  ],
  [
    "In the EU orders now, refunds may happen only when the order status is approved.",
    "only_when - in_eu_orders_now_refunds :- order.status unless eq 'approved' (string)",
  ],
  ["Refunds happen.", "null"],
  [
    "Refunds only when ready.",
    "unparsed only_when: The clause says an action happens",
  ],
  ["Only when ready", "unparsed only_when: The clause says an action happens"],
  [
    "It is not done unless asked.",
    "unparsed unless: The clause forbids an action unless",
  ],
  [
    "The cart may only when the total is positive",
    "unparsed only_when: The clause says an action happens",
  ],
  [
    "Users may only log in when the account status is active",
    "only_when - users_log_in :- account.status unless eq 'active' (string)",
  ],
  [
    "Users can log in only if the account status is active",
    "only_when - users_log_in :- account.status unless eq 'active' (string)",
  ],
  [
    "Users can log in only when the account's status is active",
    "only_when - users_log_in :- account.status unless eq 'active' (string)",
  ],
  [
    "Users can log in only when the status of the account is active",
    "only_when - users_log_in :- account.status unless eq 'active' (string)",
  ],
  [
    "Users can log in only when the account status is verified-email",
    "only_when - users_log_in :- account.status unless eq 'verified_email' (string)",
  ],
  [
    "Users can log in only when the account status is not",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the account status is any",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the account status is no",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the account status is some",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when status is active",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the account status is active and the user is known",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the account status is active but the user is known",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the account status, is active",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the account status is active or pending",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the user age is 18 or more",
    "only_when - users_log_in :- user.age unless gte 18 (number)",
  ],
  [
    "Users can log in only when the user age is 18 or more.",
    "only_when - users_log_in :- user.age unless gte 18 (number)",
  ],
  [
    "Users can log in only when the user age is 18 or more items",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the user age is 4 or fewer",
    "only_when - users_log_in :- user.age unless lte 4 (number)",
  ],
  [
    "Users can log in only when the user age is 4 or less",
    "only_when - users_log_in :- user.age unless lte 4 (number)",
  ],
  [
    "Users can log in only when the user age is 4 or fewer!",
    "only_when - users_log_in :- user.age unless lte 4 (number)",
  ],
  [
    "Users can log in only when the user age equals 21",
    "only_when - users_log_in :- user.age unless eq 21 (number)",
  ],
  [
    "Users can log in only when the user age equals five",
    "only_when - users_log_in :- user.age unless eq 5 (number)",
  ],
  [
    "Users can log in only when the user age remains positive",
    "only_when - users_log_in :- user.age unless gt 0 (number)",
  ],
  [
    "Users can log in only when the user age stays above 3",
    "only_when - users_log_in :- user.age unless gt 3 (number)",
  ],
  [
    "Users can log in only when the users age are above 3",
    "only_when - users_log_in :- users.age unless gt 3 (number)",
  ],
  [
    "Users can log in only when the user age is greater than 3",
    "only_when - users_log_in :- user.age unless gt 3 (number)",
  ],
  [
    "Users can log in only when the user age is more than 3",
    "only_when - users_log_in :- user.age unless gt 3 (number)",
  ],
  [
    "Users can log in only when the user age is higher than 3",
    "only_when - users_log_in :- user.age unless gt 3 (number)",
  ],
  [
    "Users can log in only when the user age is over 3",
    "only_when - users_log_in :- user.age unless gt 3 (number)",
  ],
  [
    "Users can log in only when the user age is exceeds 3",
    "only_when - users_log_in :- user.age unless gt 3 (number)",
  ],
  [
    "Users can log in only when the user age is exceed 3",
    "only_when - users_log_in :- user.age unless gt 3 (number)",
  ],
  [
    "Users can log in only when the user age is at least 3",
    "only_when - users_log_in :- user.age unless gte 3 (number)",
  ],
  [
    "Users can log in only when the user age is no less than 3",
    "only_when - users_log_in :- user.age unless gte 3 (number)",
  ],
  [
    "Users can log in only when the user age is not less than 3",
    "only_when - users_log_in :- user.age unless gte 3 (number)",
  ],
  [
    "Users can log in only when the user age is less than 3",
    "only_when - users_log_in :- user.age unless lt 3 (number)",
  ],
  [
    "Users can log in only when the user age is fewer than 3",
    "only_when - users_log_in :- user.age unless lt 3 (number)",
  ],
  [
    "Users can log in only when the user age is lower than 3",
    "only_when - users_log_in :- user.age unless lt 3 (number)",
  ],
  [
    "Users can log in only when the user age is below 3",
    "only_when - users_log_in :- user.age unless lt 3 (number)",
  ],
  [
    "Users can log in only when the user age is under 3",
    "only_when - users_log_in :- user.age unless lt 3 (number)",
  ],
  [
    "Users can log in only when the user age is at most 3",
    "only_when - users_log_in :- user.age unless lte 3 (number)",
  ],
  [
    "Users can log in only when the user age is no more than 3",
    "only_when - users_log_in :- user.age unless lte 3 (number)",
  ],
  [
    "Users can log in only when the user age is not more than 3",
    "only_when - users_log_in :- user.age unless lte 3 (number)",
  ],
  [
    "Users can log in only when the user age is up to 3",
    "only_when - users_log_in :- user.age unless lte 3 (number)",
  ],
  [
    "Users can log in only when the user age is not equal to 3",
    "only_when - users_log_in :- user.age unless neq 3 (number)",
  ],
  [
    "Users can log in only when the user age is different from 3",
    "only_when - users_log_in :- user.age unless neq 3 (number)",
  ],
  [
    "Users can log in only when the user age is not 3",
    "only_when - users_log_in :- user.age unless neq 3 (number)",
  ],
  [
    "Users can log in only when the user age is equal to 3",
    "only_when - users_log_in :- user.age unless eq 3 (number)",
  ],
  [
    "Users can log in only when the user age is exactly 3",
    "only_when - users_log_in :- user.age unless eq 3 (number)",
  ],
  [
    "Users can log in only when the user age is 3",
    "only_when - users_log_in :- user.age unless eq 3 (number)",
  ],
  [
    "Users can log in only when the user age is -3",
    "only_when - users_log_in :- user.age unless eq -3 (number)",
  ],
  [
    "Users can log in only when the user age is 2.5",
    "only_when - users_log_in :- user.age unless eq 2.5 (number)",
  ],
  [
    "Users can log in only when the user age is 2.",
    "only_when - users_log_in :- user.age unless eq 2 (number)",
  ],
  [
    "Users can log in only when the user age is ten",
    "only_when - users_log_in :- user.age unless eq 10 (number)",
  ],
  [
    "Users can log in only when the user age is eleven",
    "only_when - users_log_in :- user.age unless eq 'eleven' (string)",
  ],
  [
    "Users can log in only when the user age is zero",
    "only_when - users_log_in :- user.age unless eq 0 (number)",
  ],
  [
    "Users can log in only when the user age is positive",
    "only_when - users_log_in :- user.age unless gt 0 (number)",
  ],
  [
    "Users can log in only when the user age is greater than zero",
    "only_when - users_log_in :- user.age unless gt 0 (number)",
  ],
  [
    "Users can log in only when the user age is above zero",
    "only_when - users_log_in :- user.age unless gt 0 (number)",
  ],
  [
    "Users can log in only when the user age is more than zero",
    "only_when - users_log_in :- user.age unless gt 0 (number)",
  ],
  [
    "Users can log in only when the user age is negative",
    "only_when - users_log_in :- user.age unless lt 0 (number)",
  ],
  [
    "Users can log in only when the user age is below zero",
    "only_when - users_log_in :- user.age unless lt 0 (number)",
  ],
  [
    "Users can log in only when the user age is less than zero",
    "only_when - users_log_in :- user.age unless lt 0 (number)",
  ],
  [
    "Users can log in only when the user age is non-negative",
    "only_when - users_log_in :- user.age unless gte 0 (number)",
  ],
  [
    "Users can log in only when the user age is nonnegative",
    "only_when - users_log_in :- user.age unless gte 0 (number)",
  ],
  [
    "Users can log in only when the user age is not negative",
    "only_when - users_log_in :- user.age unless gte 0 (number)",
  ],
  [
    "Users can log in only when the user age is non-zero",
    "only_when - users_log_in :- user.age unless neq 0 (number)",
  ],
  [
    "Users can log in only when the user age is not zero",
    "only_when - users_log_in :- user.age unless neq 0 (number)",
  ],
  [
    "Users can log in only when the session age is under 30 minutes",
    "only_when - users_log_in :- session.age unless lt 30m (duration)",
  ],
  [
    "Users can log in only when the session age is under 30 Minutes",
    "only_when - users_log_in :- session.age unless lt 30m (duration)",
  ],
  [
    "Users can log in only when the session age is under 1 ms",
    "only_when - users_log_in :- session.age unless lt 1ms (duration)",
  ],
  [
    "Users can log in only when the session age is under 1 millisecond",
    "only_when - users_log_in :- session.age unless lt 1ms (duration)",
  ],
  [
    "Users can log in only when the session age is under 2 milliseconds",
    "only_when - users_log_in :- session.age unless lt 2ms (duration)",
  ],
  [
    "Users can log in only when the session age is under 3 s",
    "only_when - users_log_in :- session.age unless lt 3s (duration)",
  ],
  [
    "Users can log in only when the session age is under 3 sec",
    "only_when - users_log_in :- session.age unless lt 3s (duration)",
  ],
  [
    "Users can log in only when the session age is under 1 second",
    "only_when - users_log_in :- session.age unless lt 1s (duration)",
  ],
  [
    "Users can log in only when the session age is under 3 seconds",
    "only_when - users_log_in :- session.age unless lt 3s (duration)",
  ],
  [
    "Users can log in only when the session age is under 3 min",
    "only_when - users_log_in :- session.age unless lt 3m (duration)",
  ],
  [
    "Users can log in only when the session age is under 1 minute",
    "only_when - users_log_in :- session.age unless lt 1m (duration)",
  ],
  [
    "Users can log in only when the session age is under 3 h",
    "only_when - users_log_in :- session.age unless lt 3h (duration)",
  ],
  [
    "Users can log in only when the session age is under 1 hour",
    "only_when - users_log_in :- session.age unless lt 1h (duration)",
  ],
  [
    "Users can log in only when the session age is under 3 hours",
    "only_when - users_log_in :- session.age unless lt 3h (duration)",
  ],
  [
    "Users can log in only when the session age is under 3 d",
    "only_when - users_log_in :- session.age unless lt 3d (duration)",
  ],
  [
    "Users can log in only when the session age is under 1 day",
    "only_when - users_log_in :- session.age unless lt 1d (duration)",
  ],
  [
    "Users can log in only when the session age is under 3 days",
    "only_when - users_log_in :- session.age unless lt 3d (duration)",
  ],
  [
    "Users can log in only when the session age is under 3 w",
    "only_when - users_log_in :- session.age unless lt 3w (duration)",
  ],
  [
    "Users can log in only when the session age is under 1 week",
    "only_when - users_log_in :- session.age unless lt 1w (duration)",
  ],
  [
    "Users can log in only when the session age is under 3 weeks",
    "only_when - users_log_in :- session.age unless lt 3w (duration)",
  ],
  [
    "Users can log in only when the session age is under 3 fortnights",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the session age is under -3 days",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the session age is under two days",
    "only_when - users_log_in :- session.age unless lt 2d (duration)",
  ],
  [
    "Users can log in only when the session age is under 2.5 hours",
    "only_when - users_log_in :- session.age unless lt 2.5h (duration)",
  ],
  [
    "Users can log in only when the session age is under 3 days ago",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the session age is under lots",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the session age is under",
    "only_when - users_log_in :- session.age unless eq 'under' (string)",
  ],
  [
    "Users can log in only when the session age is 3 days",
    "only_when - users_log_in :- session.age unless eq 3d (duration)",
  ],
  [
    "Users can log in only when the session age is a b c",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the 9 age is positive",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the user 9 is positive",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the user's 9 is positive",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the 9's age is positive",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the age of 9 is positive",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the 9 of user is positive",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the big user age is positive",
    "only_when - users_log_in :- big_user.age unless gt 0 (number)",
  ],
  [
    "Users can log in only when The User Age Is Positive",
    "only_when - users_log_in :- user.age unless gt 0 (number)",
  ],
  [
    "Users can log in only when the user age IS positive",
    "only_when - users_log_in :- user.age unless gt 0 (number)",
  ],
  [
    "Users can log in only when the user age EQUALS 4",
    "only_when - users_log_in :- user.age unless eq 4 (number)",
  ],
  [
    "The 9 may happen only when the user age is positive",
    "unparsed only_when: The conditional clause names no action",
  ],
  [
    "The order may be submitted only when the user age is positive",
    "only_when - order :- user.age unless gt 0 (number)",
  ],
  [
    "The order may be shipped only when the user age is positive",
    "only_when - order_shipped :- user.age unless gt 0 (number)",
  ],
  [
    "The order may BE Shipped only when the user age is positive",
    "only_when - order_shipped :- user.age unless gt 0 (number)",
  ],
  [
    "The order may take place only when the user age is positive",
    "only_when - order :- user.age unless gt 0 (number)",
  ],
  [
    "The order may take  place only when the user age is positive",
    "only_when - order :- user.age unless gt 0 (number)",
  ],
  [
    "The order may start only when the user age is positive",
    "only_when - order :- user.age unless gt 0 (number)",
  ],
  [
    "The order may begin only when the user age is positive",
    "only_when - order :- user.age unless gt 0 (number)",
  ],
  [
    "The order may run only when the user age is positive",
    "only_when - order :- user.age unless gt 0 (number)",
  ],
  [
    "The order may complete only when the user age is positive",
    "only_when - order :- user.age unless gt 0 (number)",
  ],
  [
    "The order may be performed only when the user age is positive",
    "only_when - order :- user.age unless gt 0 (number)",
  ],
  [
    "The order may be placed only when the user age is positive",
    "only_when - order :- user.age unless gt 0 (number)",
  ],
  [
    "The order may be started only when the user age is positive",
    "only_when - order :- user.age unless gt 0 (number)",
  ],
  [
    "The order may be completed only when the user age is positive",
    "only_when - order :- user.age unless gt 0 (number)",
  ],
  [
    "The order may be processed only when the user age is positive",
    "only_when - order :- user.age unless gt 0 (number)",
  ],
  [
    "The order may be executed only when the user age is positive",
    "only_when - order :- user.age unless gt 0 (number)",
  ],
  [
    "The order may HAPPEN only when the user age is positive",
    "only_when - order :- user.age unless gt 0 (number)",
  ],
  [
    "The order may happened only when the user age is positive",
    "only_when - order_happened :- user.age unless gt 0 (number)",
  ],
  [
    "The order may rehappen only when the user age is positive",
    "only_when - order_rehappen :- user.age unless gt 0 (number)",
  ],
  [
    "  Users may log in only when the user age is positive.  ",
    "only_when - users_log_in :- user.age unless gt 0 (number)",
  ],
  [
    "Users may log in only when the user age is positive?!",
    "only_when - users_log_in :- user.age unless gt 0 (number)",
  ],
  [
    "Users may log in only when the user age is positive...",
    "only_when - users_log_in :- user.age unless gt 0 (number)",
  ],
  [
    "Users may not log in unless the user age is positive",
    "unless - users_log_in :- user.age unless gt 0 (number)",
  ],
  [
    "Users must not log in unless the user status is active; ok",
    "unparsed unless: The condition is not a single",
  ],
  [
    "Users never log in unless the user status is active",
    "unparsed unless: The clause forbids an action unless",
  ],
  ["Users only log in when the user status is active", "null"],
  [
    "Users can log in only when the account status equals active",
    "only_when - users_log_in :- account.status unless eq 'active' (string)",
  ],
  [
    "Users can log in only when the user age equals more than 3",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the account status is notified",
    "only_when - users_log_in :- account.status unless eq 'notified' (string)",
  ],
  [
    "Users can log in only when the account status is piano",
    "only_when - users_log_in :- account.status unless eq 'piano' (string)",
  ],
  [
    "Users can log in only when the user age is 18 or  more",
    "only_when - users_log_in :- user.age unless gte 18 (number)",
  ],
  [
    "Users can log in only when the user age is 18 or more items or more",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the user age is 2.55",
    "only_when - users_log_in :- user.age unless eq 2.55 (number)",
  ],
  [
    "Users can log in only when the session age is under 2.55 hours",
    "only_when - users_log_in :- session.age unless lt 2.55h (duration)",
  ],
  [
    "Users can log in only when the session age is under 30  minutes",
    "only_when - users_log_in :- session.age unless lt 30m (duration)",
  ],
  [
    "Users can log in only when the session age is under 0 days",
    "only_when - users_log_in :- session.age unless lt 0d (duration)",
  ],
  [
    "Users can log in only when the session age is under Five days",
    "only_when - users_log_in :- session.age unless lt 5d (duration)",
  ],
  [
    "Users can log in only when the user age is Five",
    "only_when - users_log_in :- user.age unless eq 5 (number)",
  ],
  [
    "Users can log in only when the 9x age is positive",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the user 9x is positive",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the user's  age is positive",
    "only_when - users_log_in :- user.age unless gt 0 (number)",
  ],
  [
    "Users can log in only when the age  of  the user is positive",
    "only_when - users_log_in :- user.age unless gt 0 (number)",
  ],
  [
    "Users can log in only when the user  age  is  positive",
    "only_when - users_log_in :- user.age unless gt 0 (number)",
  ],
  [
    "Users can log in only when the user ages's x is positive",
    "only_when - users_log_in :- user_ages.x unless gt 0 (number)",
  ],
  [
    "The 9x may happen only when the user age is positive",
    "unparsed only_when: The conditional clause names no action",
  ],
  [
    "Checkout may only  happen when the cart total is positive",
    "only_when - checkout :- cart.total unless gt 0 (number)",
  ],
  [
    "Checkout may happen  only when the cart total is positive",
    "only_when - checkout :- cart.total unless gt 0 (number)",
  ],
  [
    "Checkout may only happen  when the cart total is positive",
    "only_when - checkout :- cart.total unless gt 0 (number)",
  ],
  [
    "Checkout  may  only  happen  when  the cart total is positive",
    "only_when - checkout :- cart.total unless gt 0 (number)",
  ],
  [
    "Checkout may only happen today when the cart total is positive",
    "only_when - checkout_happen_today :- cart.total unless gt 0 (number)",
  ],
  ["Checkout may only happen; when the cart total is positive", "null"],
  [
    "Checkout may  only happen today when the cart total is positive",
    "only_when - checkout_happen_today :- cart.total unless gt 0 (number)",
  ],
  [
    "Refunds only  when ready",
    "unparsed only_when: The clause says an action happens",
  ],
  [
    "Orders cannot  happen unless the cart total is positive",
    "unless - orders :- cart.total unless gt 0 (number)",
  ],
  [
    "Orders cannot happen  unless the cart total is positive",
    "unless - orders :- cart.total unless gt 0 (number)",
  ],
  [
    "Orders may  not  ship unless the cart total is positive",
    "unless - orders_ship :- cart.total unless gt 0 (number)",
  ],
  [
    "Orders must  never  ship unless the cart total is positive",
    "unless - orders_ship :- cart.total unless gt 0 (number)",
  ],
  [
    "Orders shall  never  ship unless the cart total is positive",
    "unless - orders_ship :- cart.total unless gt 0 (number)",
  ],
  [
    "Orders  cannot ship unless the cart total is positive",
    "unless - orders_ship :- cart.total unless gt 0 (number)",
  ],
  [
    "Orders can't ship unless  the cart total is positive",
    "unless - orders_ship :- cart.total unless gt 0 (number)",
  ],
  [
    "Orders cannot ship unless the cart total is positive. .",
    "unless - orders_ship :- cart.total unless gt 0 (number)",
  ],
  [
    "The order may be  placed only when the user age is positive",
    "only_when - order :- user.age unless gt 0 (number)",
  ],
  [
    "The order may tobe shipped only when the user age is positive",
    "only_when - order_tobe_shipped :- user.age unless gt 0 (number)",
  ],
  [
    "The order may be shipped only when the user age is positive",
    "only_when - order_shipped :- user.age unless gt 0 (number)",
  ],
  [
    "In USA, refunds may happen only when the order status is approved",
    "only_when usa refunds :- order.status unless eq 'approved' (string)",
  ],
  [
    "In E, refunds may happen only when the order status is approved",
    "only_when - in_e_refunds :- order.status unless eq 'approved' (string)",
  ],
  [
    "In  the  EU  orders  ,  refunds may happen only when the order status is approved",
    "only_when eu refunds :- order.status unless eq 'approved' (string)",
  ],
  [
    "In the  EU, refunds may happen only when the order status is approved",
    "only_when eu refunds :- order.status unless eq 'approved' (string)",
  ],
  [
    "Refunds for EU orders, may happen only when the order status is approved",
    "only_when - refunds_for_eu_orders :- order.status unless eq 'approved' (string)",
  ],
  [
    "In the EU,refunds may happen only when the order status is approved",
    "only_when eu refunds :- order.status unless eq 'approved' (string)",
  ],
  [
    "Note\nCheckout may only happen when the cart total is positive",
    "unparsed only_when: The clause says an action happens",
  ],
  [
    "Checkout may only happen when the cart total\nis positive",
    "unparsed only_when: The clause says an action happens",
  ],
  [
    "Note\nOrders cannot ship unless the cart total is positive",
    "unparsed unless: The clause forbids an action unless",
  ],
  [
    "Orders cannot ship unless the cart total\nis positive",
    "unparsed unless: The clause forbids an action unless",
  ],
  [
    "Users can log in only when an account status is active",
    "only_when - users_log_in :- account.status unless eq 'active' (string)",
  ],
  [
    "Users can log in only when a user age is positive",
    "only_when - users_log_in :- user.age unless gt 0 (number)",
  ],
  [
    "Users can log in only when the color or more age is positive",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the user age positive",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the user age EQUALS more than 3",
    "unparsed only_when: The condition is not a single",
  ],
  [
    "Users can log in only when the user age is AT LEAST 3",
    "only_when - users_log_in :- user.age unless gte 3 (number)",
  ],
];

describe("detectConditionalRule readings", () => {
  for (const [statement, expected] of READINGS)
    test(JSON.stringify(statement), () => {
      expect(reading(statement)).toBe(expected);
    });
});

describe("detectConditionalRule results", () => {
  test("a scoped rule carries the full typed IR", () => {
    expect(
      detectConditionalRule(
        "In the EU, refunds may happen only when the order status is approved.",
      ),
    ).toStrictEqual({
      kind: "rule",
      shape: "only_when",
      evidence:
        "In the EU, refunds may happen only when the order status is approved",
      action: "refunds",
      subjectKey: "order",
      propertyKey: "status",
      scope: "eu",
      ir: {
        version: "kibi.logic.v1",
        kind: "rule",
        modality: "forbid",
        head: {
          kind: "atom",
          name: "refunds",
          args: [{ kind: "var", name: "X", type: "order" }],
        },
        body: {
          kind: "atom",
          namespace: "order",
          name: "status",
          args: [
            { kind: "var", name: "X", type: "order" },
            { kind: "var", name: "V", type: "string" },
          ],
        },
        exceptions: [
          {
            kind: "compare",
            operator: "eq",
            left: { kind: "var", name: "V", type: "string" },
            right: { kind: "const", value: "approved", type: "string" },
          },
        ],
        variables: [
          { name: "X", type: "order" },
          { name: "V", type: "string" },
        ],
        scope: { name: "eu" },
      },
    });
  });

  test("an unscoped rule has a null scope and no IR scope", () => {
    const match = detectConditionalRule(
      "Users may not log in unless the session age is under 30 minutes",
    );
    expect(match?.kind).toBe("rule");
    if (match?.kind !== "rule") return;
    expect(match.scope).toBe(null);
    expect("scope" in match.ir).toBe(false);
    expect(match.ir.exceptions).toStrictEqual([
      {
        kind: "compare",
        operator: "lt",
        left: { kind: "var", name: "V", type: "duration" },
        right: { kind: "duration", value: 30, unit: "m" },
      },
    ]);
    expect(match.ir.body).toStrictEqual({
      kind: "atom",
      namespace: "session",
      name: "age",
      args: [
        { kind: "var", name: "X", type: "session" },
        { kind: "var", name: "V", type: "duration" },
      ],
    });
  });

  test("numbers are number terms", () => {
    const match = detectConditionalRule(
      "Users can log in only when the user age is at least 18",
    );
    if (match?.kind !== "rule") throw new Error("expected a rule");
    expect(match.ir.exceptions?.[0]).toStrictEqual({
      kind: "compare",
      operator: "gte",
      left: { kind: "var", name: "V", type: "number" },
      right: { kind: "number", value: 18 },
    });
  });

  test("unparsed clauses keep the full reason and the trimmed evidence", () => {
    expect(detectConditionalRule("  Refunds only when ready.  ")).toStrictEqual(
      {
        kind: "unparsed",
        shape: "only_when",
        evidence: "Refunds only when ready",
        reason:
          "The clause says an action happens only under a condition, but its action could not be read.",
      },
    );
    expect(detectConditionalRule("It is not done unless asked.")).toStrictEqual(
      {
        kind: "unparsed",
        shape: "unless",
        evidence: "It is not done unless asked",
        reason:
          "The clause forbids an action unless a condition holds, but its action could not be read.",
      },
    );
    expect(
      detectConditionalRule(
        "The 9 may happen only when the user age is positive",
      ),
    ).toMatchObject({
      reason:
        "The conditional clause names no action that can become a rule head.",
    });
    expect(
      detectConditionalRule("Users can log in only when status is active"),
    ).toMatchObject({
      reason:
        "The condition is not a single comparison of one subject property (for example 'the cart total is positive'); define its terms before grounding it.",
    });
  });
});
