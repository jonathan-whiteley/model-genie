from __future__ import annotations
import re as _re
from ..models import DeployMetricViewRequest, DeployMetricViewResponse
from ..core import create_router, Dependencies

router = create_router()


def _build_view_url(host: str, full_name: str) -> str | None:
    """Build the Databricks Metric View editor URL."""
    host = host.rstrip("/")
    # Extract org ID from host URL query param or path (e.g. ?o=123)
    org_match = _re.search(r'[?&]o=(\d+)', host)
    org_param = f"?o={org_match.group(1)}" if org_match else ""
    return f"{host}/explore/metric_view/{full_name}/edit{org_param}"


@router.post("/deploy-metric-view", response_model=DeployMetricViewResponse, operation_id="deployMetricView")
def deploy_metric_view(request: DeployMetricViewRequest, ws: Dependencies.UserClient, sp_ws: Dependencies.Client) -> DeployMetricViewResponse:
    """Deploy a Metric View to Unity Catalog."""
    full_name = f"{request.catalog}.{request.schema_name}.{request.view_name}"
    sql = f"CREATE OR REPLACE VIEW {full_name}\nWITH METRICS\nLANGUAGE YAML\nAS $$\n{request.yaml_content}\n$$"

    try:
        warehouses = list(sp_ws.warehouses.list())
        if not warehouses:
            return DeployMetricViewResponse(success=False, message="No SQL warehouses available.")

        warehouse_id = warehouses[0].id
        if not warehouse_id:
            return DeployMetricViewResponse(success=False, message="Warehouse ID is not available.")
        result = ws.statement_execution.execute_statement(
            warehouse_id=warehouse_id,
            statement=sql,
            wait_timeout="30s",
        )

        if result.status and result.status.state and result.status.state.value == "SUCCEEDED":
            host = sp_ws.config.host or ""
            view_url = _build_view_url(host, full_name)
            return DeployMetricViewResponse(
                success=True,
                message=f"Metric view '{full_name}' created successfully.",
                view_url=view_url,
            )
        else:
            error_msg = ""
            if result.status and result.status.error:
                error_msg = result.status.error.message or "Unknown error"
            return DeployMetricViewResponse(success=False, message=f"Deployment failed: {error_msg}")
    except Exception as e:
        return DeployMetricViewResponse(success=False, message=f"Deployment error: {str(e)}")
