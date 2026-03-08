from __future__ import annotations
from pydantic import BaseModel
from typing import Literal
from .. import __version__


class VersionOut(BaseModel):
    version: str

    @classmethod
    def from_metadata(cls):
        return cls(version=__version__)


# --- Parse Questions ---

class Highlight(BaseModel):
    text: str
    type: Literal["measure", "dimension", "filter"]
    start: int
    end: int


class ParsedQuestion(BaseModel):
    original_text: str
    highlights: list[Highlight]


class ExtractedEntity(BaseModel):
    name: str
    type: Literal["measure", "dimension", "filter"]
    inferred_column: str
    source_questions: list[int]


class ParseQuestionsRequest(BaseModel):
    questions: list[str]


class ParseQuestionsResponse(BaseModel):
    parsed_questions: list[ParsedQuestion]
    entities: list[ExtractedEntity]


# --- Discover Tables ---

class ColumnMatch(BaseModel):
    entity_name: str
    catalog_column: str
    confidence: float


class TableSuggestion(BaseModel):
    table_name: str
    description: str
    confidence: float
    matched_columns: list[ColumnMatch]


class DiscoverTablesRequest(BaseModel):
    catalog: str
    entities: list[ExtractedEntity]


class DiscoverTablesResponse(BaseModel):
    tables: list[TableSuggestion]


# --- Map Columns ---

class ColumnMapping(BaseModel):
    entity_name: str
    entity_type: Literal["measure", "dimension", "filter"]
    table: str
    column: str
    aggregation: str | None = None
    confidence: float


class MapColumnsRequest(BaseModel):
    entities: list[ExtractedEntity]
    selected_tables: list[str]


class MapColumnsResponse(BaseModel):
    mappings: list[ColumnMapping]


# --- Generate Metric View ---

class ConfirmedMapping(BaseModel):
    entity_name: str
    entity_type: Literal["measure", "dimension", "filter"]
    table: str
    column: str
    aggregation: str | None = None


class ERDNode(BaseModel):
    id: str
    table_name: str
    columns: list[str]


class ERDEdge(BaseModel):
    source: str
    target: str
    source_column: str
    target_column: str


class ERDSpec(BaseModel):
    nodes: list[ERDNode]
    edges: list[ERDEdge]


class GenerateMetricViewRequest(BaseModel):
    confirmed_mappings: list[ConfirmedMapping]
    source_table: str
    view_name: str


class GenerateMetricViewResponse(BaseModel):
    yaml_content: str
    erd: ERDSpec


# --- Deploy Metric View ---

class DeployMetricViewRequest(BaseModel):
    catalog: str
    schema_name: str
    view_name: str
    yaml_content: str


class DeployMetricViewResponse(BaseModel):
    success: bool
    message: str
    view_url: str | None = None


# --- Catalogs ---

class CatalogListResponse(BaseModel):
    catalogs: list[str]
