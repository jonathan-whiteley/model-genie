from __future__ import annotations
import logging

from databricks.sdk import WorkspaceClient

from ..models import (
    CatalogListResponse,
    DiscoverTablesRequest,
    DiscoverTablesResponse,
    TableSuggestion,
    ColumnMatch,
)
from ..llm import call_llm
from ..core import create_router, Dependencies

logger = logging.getLogger(__name__)

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


def _get_warehouse_id(ws: WorkspaceClient) -> str:
    """Get the first available SQL warehouse ID."""
    for wh in ws.warehouses.list():
        if wh.id:
            return wh.id
    raise ValueError("No SQL warehouses available")


def _run_sql(ws: WorkspaceClient, warehouse_id: str, sql: str) -> list[list[str]]:
    """Execute SQL via statement execution and return rows."""
    result = ws.statement_execution.execute_statement(
        warehouse_id=warehouse_id,
        statement=sql,
        wait_timeout="50s",
    )
    rows: list[list[str]] = []
    if result.result and result.result.data_array:
        rows = result.result.data_array
    return rows


@router.get("/catalogs", response_model=CatalogListResponse, operation_id="listCatalogs")
def list_catalogs(ws: Dependencies.UserClient, sp_ws: Dependencies.Client) -> CatalogListResponse:
    """List available Unity Catalog catalogs using SQL."""
    warehouse_id = _get_warehouse_id(sp_ws)
    rows = _run_sql(ws, warehouse_id, "SHOW CATALOGS")
    catalogs = [row[0] for row in rows if row and row[0]]
    return CatalogListResponse(catalogs=catalogs)


@router.post("/discover-tables", response_model=DiscoverTablesResponse, operation_id="discoverTables")
def discover_tables(request: DiscoverTablesRequest, ws: Dependencies.UserClient, sp_ws: Dependencies.Client) -> DiscoverTablesResponse:
    """Search Unity Catalog for tables relevant to the extracted entities."""
    warehouse_id = _get_warehouse_id(sp_ws)

    # Single query to get all tables and their columns via information_schema
    sql = f"""
    SELECT
        t.table_schema,
        t.table_name,
        t.comment AS table_comment,
        c.column_name,
        c.data_type,
        c.comment AS column_comment
    FROM `{request.catalog}`.information_schema.tables t
    JOIN `{request.catalog}`.information_schema.columns c
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE t.table_schema != 'information_schema'
    ORDER BY t.table_schema, t.table_name, c.ordinal_position
    """
    logger.info("Discovering tables in catalog=%s with %d entities", request.catalog, len(request.entities))
    rows = _run_sql(ws, warehouse_id, sql)
    logger.info("information_schema returned %d rows", len(rows))

    # Group columns by table
    table_metadata: dict[str, dict] = {}
    for row in rows:
        if not row or len(row) < 6:
            continue
        schema_name, table_name = row[0], row[1]
        full_name = f"{request.catalog}.{schema_name}.{table_name}"
        if full_name not in table_metadata:
            table_metadata[full_name] = {
                "full_name": full_name,
                "comment": row[2] or "",
                "columns": [],
            }
        table_metadata[full_name]["columns"].append({
            "name": row[3],
            "type": row[4] or "",
            "comment": row[5] or "",
        })

    logger.info("Found %d unique tables in catalog", len(table_metadata))

    entities_text = "\n".join(
        f"- {e.name} ({e.type}), inferred column: {e.inferred_column}"
        for e in request.entities
    )
    tables_text = ""
    for t in table_metadata.values():
        cols = ", ".join(f"{c['name']} ({c['type']})" for c in t["columns"][:30])
        tables_text += f"\nTable: {t['full_name']}\n  Comment: {t['comment']}\n  Columns: {cols}\n"

    result = call_llm(
        SCORE_SYSTEM_PROMPT,
        f"Business entities:\n{entities_text}\n\nAvailable tables:\n{tables_text}",
        sp_ws,
    )

    logger.info("LLM returned %d tables", len(result.get("tables", [])))

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
