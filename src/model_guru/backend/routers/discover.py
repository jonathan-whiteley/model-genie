from __future__ import annotations

from ..models import (
    CatalogListResponse,
    DiscoverTablesRequest,
    DiscoverTablesResponse,
    TableSuggestion,
    ColumnMatch,
)
from ..llm import call_llm
from ..core import create_router, Dependencies

router = create_router()

SCORE_SYSTEM_PROMPT = """You are a data engineer. Given a list of business entities (measures, dimensions, filters) and a set of database tables with their columns, score how relevant each table is to answering business questions about these entities.

For each table, provide:
- confidence: 0-100 score of how likely this table is needed
- description: brief explanation of what this table contains and why it's relevant
- matched_columns: for each entity that matches a column in this table, include the mapping

Respond ONLY with JSON (no markdown fences):
{
  "tables": [
    {
      "table_name": "catalog.schema.table",
      "description": "Brief description",
      "confidence": 95,
      "matched_columns": [
        {"entity_name": "Net Sales", "catalog_column": "net_sales_amt", "confidence": 90}
      ]
    }
  ]
}

Only include tables with confidence > 50. Sort by confidence descending."""


@router.get("/catalogs", response_model=CatalogListResponse, operation_id="listCatalogs")
def list_catalogs(ws: Dependencies.Client) -> CatalogListResponse:
    """List available Unity Catalog catalogs."""
    catalogs = [c.name for c in ws.catalogs.list() if c.name]
    return CatalogListResponse(catalogs=catalogs)


@router.post("/discover-tables", response_model=DiscoverTablesResponse, operation_id="discoverTables")
def discover_tables(request: DiscoverTablesRequest, ws: Dependencies.Client) -> DiscoverTablesResponse:
    """Search Unity Catalog for tables relevant to the extracted entities."""
    table_metadata: list[dict] = []
    for schema in ws.schemas.list(catalog_name=request.catalog):
        if not schema.name or schema.name.startswith("__"):
            continue
        try:
            for table in ws.tables.list(catalog_name=request.catalog, schema_name=schema.name):
                if not table.full_name:
                    continue
                columns = []
                if table.columns:
                    columns = [
                        {"name": c.name, "type": str(c.type_name) if c.type_name else "", "comment": c.comment or ""}
                        for c in table.columns if c.name
                    ]
                table_metadata.append({
                    "full_name": table.full_name,
                    "comment": table.comment or "",
                    "columns": columns,
                })
        except Exception:
            continue

    entities_text = "\n".join(
        f"- {e.name} ({e.type}), inferred column: {e.inferred_column}"
        for e in request.entities
    )
    tables_text = ""
    for t in table_metadata:
        cols = ", ".join(f"{c['name']} ({c['type']})" for c in t["columns"][:30])
        tables_text += f"\nTable: {t['full_name']}\n  Comment: {t['comment']}\n  Columns: {cols}\n"

    result = call_llm(
        SCORE_SYSTEM_PROMPT,
        f"Business entities:\n{entities_text}\n\nAvailable tables:\n{tables_text}",
    )

    tables = [
        TableSuggestion(
            table_name=t["table_name"],
            description=t["description"],
            confidence=t["confidence"],
            matched_columns=[ColumnMatch(**mc) for mc in t.get("matched_columns", [])],
        )
        for t in result.get("tables", [])
    ]
    return DiscoverTablesResponse(tables=tables)
