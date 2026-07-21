from __future__ import annotations

import hashlib
import json
from typing import Annotated, ClassVar, Final, Literal, TypeAlias

from pydantic import BaseModel, ConfigDict, Field, RootModel
from pydantic.config import ExtraValues
from typing_extensions import Self, override

SCHEMA_VERSION: Final = "1.0.0"
SHA256_PATTERN: Final = r"^[a-f0-9]{64}$"
MAX_CONTRACT_BYTES: Final = 1_048_576

Sha256 = Annotated[str, Field(pattern=SHA256_PATTERN)]
NonEmptyString = Annotated[str, Field(min_length=1)]
JsonValue: TypeAlias = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]


class ContractValidationError(ValueError):
    def __init__(self, message: str) -> None:
        self.message: str = message
        super().__init__(message)


class JsonNode(
    RootModel[str | int | float | bool | None | list["JsonNode"] | dict[str, "JsonNode"]]
):
    pass


class ContractModel(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(
        extra="forbid",
        frozen=True,
        validate_by_alias=True,
        validate_by_name=True,
        serialize_by_alias=True,
    )

    @classmethod
    @override
    def model_validate_json(
        cls,
        json_data: str | bytes | bytearray,
        *,
        strict: bool | None = None,
        extra: ExtraValues | None = None,
        context: JsonValue = None,
        by_alias: bool | None = None,
        by_name: bool | None = None,
    ) -> Self:
        size = len(json_data.encode()) if isinstance(json_data, str) else len(json_data)
        if size > MAX_CONTRACT_BYTES:
            raise ContractValidationError(f"contract exceeds {MAX_CONTRACT_BYTES} bytes")
        return super().model_validate_json(
            json_data,
            strict=strict,
            extra=extra,
            context=context,
            by_alias=by_alias,
            by_name=by_name,
        )


class Usage(ContractModel):
    input_tokens: Annotated[int, Field(alias="inputTokens", ge=0)]
    cached_input_tokens: Annotated[int, Field(alias="cachedInputTokens", ge=0)]
    output_tokens: Annotated[int, Field(alias="outputTokens", ge=0)]


class PriceEquivalentEstimate(ContractModel):
    currency: Literal["USD"]
    amount: Annotated[float, Field(ge=0)]
    pricing_hash: Annotated[Sha256, Field(alias="pricingHash")]
    kind: Literal["price-equivalent-estimate-not-invoice"]


def contract_hash(value: JsonValue) -> str:
    encoded = json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode()
    return hashlib.sha256(encoded).hexdigest()


def json_node_value(node: JsonNode) -> JsonValue:
    match node.root:  # noqa: MATCH_OK
        case None | str() | bool() | int() as scalar:
            return scalar
        case float() as number:
            return int(number) if number.is_integer() else number
        case list() as items:
            return [json_node_value(item) for item in items]
        case dict() as entries:
            return {key: json_node_value(entry) for key, entry in entries.items()}


def parse_json_value(text: str) -> JsonValue:
    if len(text.encode()) > MAX_CONTRACT_BYTES:
        raise ContractValidationError(f"contract exceeds {MAX_CONTRACT_BYTES} bytes")
    return json_node_value(JsonNode.model_validate_json(text))
