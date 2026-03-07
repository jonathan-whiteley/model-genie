from __future__ import annotations
import yaml
from ..models import (
    GenerateMetricViewRequest,
    GenerateMetricViewResponse,
    ERDSpec,
    ERDNode,
    ERDEdge,
)
from ..core import create_router

router = create_router()


def build_metric_view_yaml(request: GenerateMetricViewRequest) -> str:
    """Build Metric View YAML from confirmed mappings."""
    tables_used: dict[str, list] = {}
    for m in request.confirmed_mappings:
        tables_used.setdefault(m.table, []).append(m)

    source_table = request.source_table

    joins = []
    for table_name in tables_used:
        if table_name == source_table:
            continue
        alias = table_name.split(".")[-1]
        joins.append({
            "name": alias,
            "source": table_name,
            "on": f"source.{alias}_id = {alias}.id",
        })

    dimensions = []
    for m in request.confirmed_mappings:
        if m.entity_type in ("dimension", "filter"):
            if m.table != source_table:
                table_alias = m.table.split(".")[-1]
                expr = f"{table_alias}.{m.column}"
            else:
                expr = m.column
            dimensions.append({"name": m.entity_name, "expr": expr})

    measures = []
    for m in request.confirmed_mappings:
        if m.entity_type == "measure":
            if m.table != source_table:
                table_alias = m.table.split(".")[-1]
                col_ref = f"{table_alias}.{m.column}"
            else:
                col_ref = m.column
            agg = m.aggregation or "SUM"
            measures.append({"name": m.entity_name, "expr": f"{agg}({col_ref})"})

    mv: dict = {
        "version": "1.1",
        "comment": f"Metric view for {request.view_name}",
        "source": source_table,
    }
    if joins:
        mv["joins"] = joins
    if dimensions:
        mv["dimensions"] = dimensions
    if measures:
        mv["measures"] = measures

    return yaml.dump(mv, default_flow_style=False, sort_keys=False, allow_unicode=True)


def build_erd(request: GenerateMetricViewRequest) -> ERDSpec:
    """Build ERD nodes and edges from confirmed mappings."""
    tables_used: dict[str, list[str]] = {}
    for m in request.confirmed_mappings:
        tables_used.setdefault(m.table, []).append(m.column)

    nodes = [
        ERDNode(id=table_name, table_name=table_name, columns=list(set(cols)))
        for table_name, cols in tables_used.items()
    ]

    source_table = request.source_table
    edges = []
    for table_name in tables_used:
        if table_name != source_table:
            alias = table_name.split(".")[-1]
            edges.append(ERDEdge(
                source=source_table,
                target=table_name,
                source_column=f"{alias}_id",
                target_column="id",
            ))

    return ERDSpec(nodes=nodes, edges=edges)


@router.post("/generate-metric-view", response_model=GenerateMetricViewResponse, operation_id="generateMetricView")
async def generate_metric_view(request: GenerateMetricViewRequest) -> GenerateMetricViewResponse:
    """Generate Metric View YAML and ERD from confirmed mappings."""
    yaml_content = build_metric_view_yaml(request)
    erd = build_erd(request)
    return GenerateMetricViewResponse(yaml_content=yaml_content, erd=erd)
