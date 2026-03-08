from __future__ import annotations
from databricks.sdk import WorkspaceClient

from ..models import MapColumnsRequest, MapColumnsResponse, ColumnMapping
from ..llm import call_llm
from ..core import create_router, Dependencies

router = create_router()

MAP_SYSTEM_PROMPT = """You are a data engineer. Given business entities (measures, dimensions, filters) and detailed column information for selected tables, suggest the best column mapping for each entity.

For measures, also suggest the appropriate aggregation function (SUM, COUNT, AVG, MIN, MAX, COUNT_DISTINCT).
For dimensions and filters, set aggregation to null.

Respond ONLY with JSON (no markdown fences):
{
  "mappings": [
    {
      "entity_name": "Net Sales",
      "entity_type": "measure",
      "table": "catalog.schema.sales_fact",
      "column": "net_sales_amt",
      "aggregation": "SUM",
      "confidence": 95
    }
  ]
}"""


def _get_warehouse_id(ws: WorkspaceClient) -> str:
    for wh in ws.warehouses.list():
        if wh.id:
            return wh.id
    raise ValueError("No SQL warehouses available")


def _run_sql(ws: WorkspaceClient, warehouse_id: str, sql: str) -> list[list[str]]:
    result = ws.statement_execution.execute_statement(
        warehouse_id=warehouse_id, statement=sql, wait_timeout="50s",
    )
    rows: list[list[str]] = []
    if result.result and result.result.data_array:
        rows = result.result.data_array
    return rows


@router.post("/map-columns", response_model=MapColumnsResponse, operation_id="mapColumns")
def map_columns(request: MapColumnsRequest, ws: Dependencies.UserClient, sp_ws: Dependencies.Client) -> MapColumnsResponse:
    """Suggest column mappings for entities from selected tables."""
    warehouse_id = _get_warehouse_id(sp_ws)

    # Build a single query for all selected tables
    conditions = []
    for table_name in request.selected_tables:
        parts = table_name.split(".")
        if len(parts) == 3:
            conditions.append(
                f"(c.table_catalog = '{parts[0]}' AND c.table_schema = '{parts[1]}' AND c.table_name = '{parts[2]}')"
            )

    if not conditions:
        return MapColumnsResponse(mappings=[])

    sql = f"""
    SELECT
        c.table_catalog || '.' || c.table_schema || '.' || c.table_name AS full_name,
        c.column_name,
        c.data_type,
        c.comment
    FROM {request.selected_tables[0].split('.')[0]}.information_schema.columns c
    WHERE {' OR '.join(conditions)}
    ORDER BY full_name, c.ordinal_position
    """
    rows = _run_sql(ws, warehouse_id, sql)

    # Group by table
    tables_detail: dict[str, dict] = {}
    for row in rows:
        if not row or len(row) < 4:
            continue
        full_name = row[0]
        if full_name not in tables_detail:
            tables_detail[full_name] = {"full_name": full_name, "comment": "", "columns": []}
        tables_detail[full_name]["columns"].append({
            "name": row[1],
            "type": row[2] or "",
            "comment": row[3] or "",
        })

    entities_text = "\n".join(
        f"- {e.name} ({e.type}), inferred column: {e.inferred_column}"
        for e in request.entities
    )
    tables_text = ""
    for t in tables_detail.values():
        cols = "\n    ".join(f"- {c['name']} ({c['type']}): {c['comment']}" for c in t["columns"])
        tables_text += f"\nTable: {t['full_name']}\n  Columns:\n    {cols}\n"

    result = call_llm(
        MAP_SYSTEM_PROMPT,
        f"Business entities:\n{entities_text}\n\nSelected tables:\n{tables_text}",
        sp_ws,
    )
    mappings = [ColumnMapping(**m) for m in result.get("mappings", [])]
    return MapColumnsResponse(mappings=mappings)
