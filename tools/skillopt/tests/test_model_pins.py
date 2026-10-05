from __future__ import annotations

import os
import unittest
from collections.abc import Generator
from contextlib import contextmanager
from pathlib import Path

from pydantic import ValidationError
from tools.skillopt.kibi_skillopt import LedgerEntry, RunLock
from tools.skillopt.kibi_skillopt.common import (
    ContractValidationError,
    JsonNode,
    JsonValue,
    json_node_value,
)
from tools.skillopt.kibi_skillopt.model_pins import resolve_model_config

REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURE_PATH = REPO_ROOT / "scripts/skillopt-eval/tests/fixtures/valid-run-lock.json"
ENV_KEYS = (
    "KIBI_SKILLOPT_TARGET_MODEL",
    "KIBI_SKILLOPT_TARGET_EFFORT",
    "KIBI_SKILLOPT_OPTIMIZER_MODEL",
    "KIBI_SKILLOPT_OPTIMIZER_EFFORT",
)
OVERRIDE = {
    "KIBI_SKILLOPT_TARGET_MODEL": "gpt-next-mini",
    "KIBI_SKILLOPT_TARGET_EFFORT": "low",
    "KIBI_SKILLOPT_OPTIMIZER_MODEL": "gpt-next-pro",
    "KIBI_SKILLOPT_OPTIMIZER_EFFORT": "xhigh",
}
PRICING: dict[str, JsonValue] = {
    "inputPerMillionTokens": 1,
    "cachedInputPerMillionTokens": 0.1,
    "outputPerMillionTokens": 4,
}


@contextmanager
def model_env(values: dict[str, str]) -> Generator[None, None, None]:
    saved = {key: os.environ.get(key) for key in ENV_KEYS}
    for key in ENV_KEYS:
        _ = os.environ.pop(key, None)
    os.environ.update(values)
    try:
        yield
    finally:
        for key, value in saved.items():
            if value is None:
                _ = os.environ.pop(key, None)
            else:
                os.environ[key] = value


def load_run_lock() -> dict[str, JsonValue]:
    node = JsonNode.model_validate_json(FIXTURE_PATH.read_text(encoding="utf-8"))
    if not isinstance(node.root, dict):
        raise AssertionError("run-lock fixture must be an object")
    return {key: json_node_value(value) for key, value in node.root.items()}


def overridden_run_lock() -> dict[str, JsonValue]:
    lock = load_run_lock()
    pricing = lock["pricing"]
    if not isinstance(pricing, dict):
        raise AssertionError("pricing must be an object")
    return {
        **lock,
        "targetModel": "gpt-next-mini",
        "targetReasoningEffort": "low",
        "optimizerModel": "gpt-next-pro",
        "optimizerReasoningEffort": "xhigh",
        "pricing": {**pricing, "models": {"gpt-next-mini": PRICING, "gpt-next-pro": PRICING}},
    }


def ledger_entry(model: str) -> dict[str, JsonValue]:
    return {
        "schemaVersion": "1.0.0",
        "artifactType": "ledger-entry",
        "runId": "00000000-0000-4000-8000-000000000001",
        "sequence": 0,
        "previousEntryHash": None,
        "entryHash": "b" * 64,
        "occurredAt": "2026-07-21T12:00:00Z",
        "category": "development",
        "model": model,
        "usage": {"inputTokens": 0, "cachedInputTokens": 0, "outputTokens": 0},
        "priceEquivalentEstimate": {
            "currency": "USD",
            "amount": 0,
            "pricingHash": "b" * 64,
            "kind": "price-equivalent-estimate-not-invoice",
        },
    }


class ModelPinTests(unittest.TestCase):
    def test_defaults_match_historical_pins(self) -> None:
        config = resolve_model_config({})
        self.assertEqual(config.target_model, "gpt-5.6-luna")
        self.assertEqual(config.target_reasoning_effort, "medium")
        self.assertEqual(config.optimizer_model, "gpt-5.6-sol")
        self.assertEqual(config.optimizer_reasoning_effort, "xhigh")

    def test_invalid_model_ids_and_efforts_are_rejected(self) -> None:
        for env in (
            {"KIBI_SKILLOPT_TARGET_MODEL": "GPT 5"},
            {"KIBI_SKILLOPT_OPTIMIZER_MODEL": "../model"},
            {"KIBI_SKILLOPT_TARGET_EFFORT": "extreme"},
        ):
            with self.assertRaises(ContractValidationError):
                _ = resolve_model_config(env)

    def test_run_lock_must_match_active_pins(self) -> None:
        with model_env({}):
            _ = RunLock.model_validate(load_run_lock())
            with self.assertRaisesRegex(ValidationError, "active model configuration"):
                _ = RunLock.model_validate(overridden_run_lock())
        with model_env(OVERRIDE):
            lock = RunLock.model_validate(overridden_run_lock())
            self.assertEqual(lock.target_reasoning_effort, "low")
            with self.assertRaisesRegex(ValidationError, "active model configuration"):
                _ = RunLock.model_validate(load_run_lock())

    def test_run_lock_pricing_must_cover_pinned_models(self) -> None:
        with model_env({}):
            lock = load_run_lock()
            pricing = lock["pricing"]
            if not isinstance(pricing, dict):
                raise AssertionError("pricing must be an object")
            tampered = {**lock, "pricing": {**pricing, "models": {"gpt-5.6-sol": PRICING}}}
            with self.assertRaisesRegex(ValidationError, "price exactly the pinned models"):
                _ = RunLock.model_validate(tampered)

    def test_ledger_entries_only_accept_pinned_models(self) -> None:
        with model_env({}):
            _ = LedgerEntry.model_validate(ledger_entry("gpt-5.6-luna"))
            with self.assertRaisesRegex(ValidationError, "model_not_pinned"):
                _ = LedgerEntry.model_validate(ledger_entry("gpt-next-mini"))
        with model_env(OVERRIDE):
            _ = LedgerEntry.model_validate(ledger_entry("gpt-next-mini"))
            with self.assertRaisesRegex(ValidationError, "model_not_pinned"):
                _ = LedgerEntry.model_validate(ledger_entry("gpt-5.6-sol"))


if __name__ == "__main__":
    _ = unittest.main()
