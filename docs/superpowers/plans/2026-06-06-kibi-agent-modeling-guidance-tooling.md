# Kibi Agent Modeling Guidance and Tooling Improvement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Kibi modeling failures recoverable and make strict/predicate KB modeling obvious to agents before they fall back to prose.

**Architecture:** Improve the full agent path from guidance → tool schema → validation error → recovery. Keep Kibi's existing eight-entity model and fact lanes; add a compact modeling decision guide, richer MCP errors, validation previews, and tests that encode a real-product failure mode where camelCase strict-fact fields were rejected and the agent fell back to `links`/`text_ref` prose.

**Tech Stack:** Bun, TypeScript, MCP server, AJV/JSON Schema, SWI-Prolog validation, Markdown documentation, existing Kibi test suites.

---

This branch implements the plan through recoverable `kb_upsert` diagnostics, modeling-helper warnings, a modeling cheatsheet, an MCP error reference, product-KB improvement agent instructions, tests, and release metadata.
