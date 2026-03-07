from __future__ import annotations
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


@router.post("/map-columns", response_model=MapColumnsResponse, operation_id="mapColumns")
def map_columns(request: MapColumnsRequest, ws: Dependencies.Client) -> MapColumnsResponse:
    """Suggest column mappings for entities from selected tables."""
    tables_detail: list[dict] = []
    for table_name in request.selected_tables:
        try:
            table_info = ws.tables.get(full_name=table_name)
            columns = []
            if table_info.columns:
                columns = [
                    {"name": c.name, "type": str(c.type_name) if c.type_name else "", "comment": c.comment or ""}
                    for c in table_info.columns if c.name
                ]
            tables_detail.append({
                "full_name": table_name,
                "comment": table_info.comment or "",
                "columns": columns,
            })
        except Exception:
            continue

    entities_text = "\n".join(
        f"- {e.name} ({e.type}), inferred column: {e.inferred_column}"
        for e in request.entities
    )
    tables_text = ""
    for t in tables_detail:
        cols = "\n    ".join(f"- {c['name']} ({c['type']}): {c['comment']}" for c in t["columns"])
        tables_text += f"\nTable: {t['full_name']}\n  Comment: {t['comment']}\n  Columns:\n    {cols}\n"

    result = call_llm(
        MAP_SYSTEM_PROMPT,
        f"Business entities:\n{entities_text}\n\nSelected tables:\n{tables_text}",
    )
    mappings = [ColumnMapping(**m) for m in result.get("mappings", [])]
    return MapColumnsResponse(mappings=mappings)
