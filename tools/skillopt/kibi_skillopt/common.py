from __future__ import annotations

import hashlib
import json
from datetime import date
from typing import Annotated, ClassVar, Final, Literal, TypeAlias

import jcs
from pydantic import BaseModel, ConfigDict, Field, RootModel
from pydantic.config import ExtraValues
from pydantic.functional_validators import AfterValidator, model_validator
from typing_extensions import Self, assert_never, override

SCHEMA_VERSION: Final = "1.0.0"
SHA256_PATTERN: Final = r"^[a-f0-9]{64}$"
ARTIFACT_ID_PATTERN: Final = (
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
)
TIMESTAMP_PATTERN: Final = (
    r"^(?:[0-9]{3}[1-9]|[0-9]{2}[1-9][0-9]|[0-9][1-9][0-9]{2}|[1-9][0-9]{3})"
    r"-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])"
    r"T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?Z$"
)
MAX_CONTRACT_BYTES: Final = 1_048_576

Sha256 = Annotated[str, Field(pattern=SHA256_PATTERN)]
NonEmptyString = Annotated[str, Field(min_length=1)]
ArtifactId = Annotated[str, Field(pattern=ARTIFACT_ID_PATTERN)]


def parse_timestamp(value: str) -> str:
    _ = date.fromisoformat(value[:10])
    return value


Timestamp = Annotated[
    str,
    Field(pattern=TIMESTAMP_PATTERN),
    AfterValidator(parse_timestamp),
]
JsonInteger = Annotated[int, Field(strict=True)]
JsonNumber = Annotated[float, Field(strict=True)]
JsonBoolean = Annotated[bool, Field(strict=True)]
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
        allow_inf_nan=False,
        validate_by_alias=True,
        validate_by_name=True,
        serialize_by_alias=True,
    )

    @model_validator(mode="before")
    @classmethod
    def enforce_serialized_size(cls, value: JsonValue) -> JsonValue:
        encoded = json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode()
        if len(encoded) > MAX_CONTRACT_BYTES:
            raise ContractValidationError(f"contract exceeds {MAX_CONTRACT_BYTES} bytes")
        return value

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
    input_tokens: Annotated[JsonInteger, Field(alias="inputTokens", ge=0)]
    cached_input_tokens: Annotated[JsonInteger, Field(alias="cachedInputTokens", ge=0)]
    output_tokens: Annotated[JsonInteger, Field(alias="outputTokens", ge=0)]


class PriceEquivalentEstimate(ContractModel):
    currency: Literal["USD"]
    amount: Annotated[JsonNumber, Field(ge=0)]
    pricing_hash: Annotated[Sha256, Field(alias="pricingHash")]
    kind: Literal["price-equivalent-estimate-not-invoice"]


def canonical_json(value: JsonValue) -> str:
    canonical = jcs.canonicalize(value)
    return canonical.decode("utf-8") if isinstance(canonical, bytes) else canonical


def contract_hash(value: JsonValue) -> str:
    return hashlib.sha256(canonical_json(value).encode()).hexdigest()


def json_node_value(node: JsonNode) -> JsonValue:
    value = node.root
    match value:
        case None | str() | bool() | int() as scalar:
            return scalar
        case float() as number:
            return int(number) if number.is_integer() else number
        case list() as items:
            return [json_node_value(item) for item in items]
        case dict() as entries:
            return {key: json_node_value(entry) for key, entry in entries.items()}
    assert_never(value)


def parse_json_value(text: str) -> JsonValue:
    if len(text.encode()) > MAX_CONTRACT_BYTES:
        raise ContractValidationError(f"contract exceeds {MAX_CONTRACT_BYTES} bytes")
    return json_node_value(JsonNode.model_validate_json(text))
