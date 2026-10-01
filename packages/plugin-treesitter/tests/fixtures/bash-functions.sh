#!/usr/bin/env bash
function keyword_fn() { printf '%s\n' keyword; }
plain_fn() { printf '%s\n' posix; }
spaced_fn () { :; }
function no_parens { :; }
outer() {
  inner() { :; }
}
plain_fn() { printf '%s\n' replacement; }
plain_fn
