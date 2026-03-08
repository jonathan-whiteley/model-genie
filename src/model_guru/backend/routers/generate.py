from __future__ import annotations
from ..models import (
    GenerateMetricViewRequest,
    GenerateMetricViewResponse,
    ERDSpec,
    ERDNode,
    ERDEdge,
)
from ..llm import call_llm
from ..core import create_router, Dependencies

router = create_router()

GENERATE_SYSTEM_PROMPT = """You are a Databricks Metric View expert. Generate a Metric View YAML definition (version 1.1) from confirmed column mappings.

CRITICAL RULE — JOINS:
- If ANY mapping references a table that is NOT the source table, you MUST add a join for that table.
- Every non-source table MUST have a join entry with "name" (short table name like "dim_products") and "source" (fully qualified name).
- Joins MUST use "using" with a list of shared key columns. Example: using:\n  - product_id
- A dimension/measure that references a joined table uses "join_name.column" syntax (e.g., "dim_products.category").
- If a joined table's column is referenced but no join exists, the YAML WILL FAIL with UNRESOLVED_COLUMN.

Here is a COMPLETE WORKING EXAMPLE:

```yaml
version: 1.1
source: jdub_demo.little_caesars.fact_transactions
joins:
  - name: dim_products
    source: jdub_demo.little_caesars.dim_products
    using:
      - product_id
  - name: dim_stores
    source: jdub_demo.little_caesars.dim_stores
    using:
      - store_id
dimensions:
  - name: date_id
    expr: date_id
    comment: "Date of the transaction"
  - name: product_category
    expr: dim_products.category
    comment: "Product category from dim table"
measures:
  - name: net_sales
    expr: SUM(net_sales)
    comment: "Total net sales"
```

RULES:
1. ONLY use columns from the confirmed mappings — never invent column names
2. Source table columns: use column name directly (e.g., "date_id", "SUM(net_sales)")
3. Joined table columns: use "join_name.column" (e.g., "dim_products.category")
4. Measures must be simple aggregates: SUM, COUNT, AVG, MIN, MAX, COUNT(DISTINCT). NO window functions (OVER, PARTITION BY, LAG, LEAD, FILTER)
5. For complex measures like YoY Growth, simplify to basic SUM with an explanatory comment
6. Valid YAML fields ONLY:
   - Top-level: version, source, comment, filter, dimensions, measures, joins
   - Dimension: name, expr, comment
   - Measure: name, expr, comment
   - Join: name, source, using
   - NO "join_type", "type", "display_name", "relationship", or other fields

Also generate an ERD spec with nodes (tables + columns used) and edges (join relationships).

Respond ONLY with JSON (no markdown fences):
{
  "yaml_content": "the complete YAML string",
  "erd": {
    "nodes": [{"id": "catalog.schema.table", "table_name": "catalog.schema.table", "columns": ["col1", "col2"]}],
    "edges": [{"source": "catalog.schema.fact_table", "target": "catalog.schema.dim_table", "source_column": "product_id", "target_column": "product_id"}]
  }
}"""




@router.post("/generate-metric-view", response_model=GenerateMetricViewResponse, operation_id="generateMetricView")
def generate_metric_view(request: GenerateMetricViewRequest, sp_ws: Dependencies.Client) -> GenerateMetricViewResponse:
    """Generate Metric View YAML and ERD from confirmed mappings using LLM."""
    mappings_text = "\n".join(
        f"- {m.entity_name} ({m.entity_type}): table={m.table}, column={m.column}, aggregation={m.aggregation or 'N/A'}"
        for m in request.confirmed_mappings
    )

    # Build a list of valid columns per table so the LLM knows exactly what exists
    table_columns: dict[str, list[str]] = {}
    for m in request.confirmed_mappings:
        table_columns.setdefault(m.table, []).append(m.column)

    columns_text = "\n".join(
        f"- {table}: columns=[{', '.join(cols)}]"
        for table, cols in table_columns.items()
    )

    # Identify tables that need joins (any table that isn't the source)
    joined_tables = [t for t in table_columns if t != request.source_table]
    join_warning = ""
    if joined_tables:
        join_warning = "\n\nIMPORTANT — These tables are NOT the source table and MUST have joins defined:\n" + "\n".join(
            f"- {t} (you MUST add a join for this table with appropriate key columns)"
            for t in joined_tables
        )

    result = call_llm(
        GENERATE_SYSTEM_PROMPT,
        f"Source table: {request.source_table}\nView name: {request.view_name}\n\nConfirmed mappings:\n{mappings_text}\n\nAvailable columns per table (ONLY use these):\n{columns_text}{join_warning}",
        sp_ws,
    )

    yaml_content = result.get("yaml_content", "")
    erd_data = result.get("erd", {"nodes": [], "edges": []})

    erd = ERDSpec(
        nodes=[ERDNode(**n) for n in erd_data.get("nodes", [])],
        edges=[ERDEdge(**e) for e in erd_data.get("edges", [])],
    )

    return GenerateMetricViewResponse(yaml_content=yaml_content, erd=erd)
