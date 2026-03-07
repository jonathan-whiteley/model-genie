from __future__ import annotations
from ..models import DeployMetricViewRequest, DeployMetricViewResponse
from ..core import create_router, Dependencies

router = create_router()


@router.post("/deploy-metric-view", response_model=DeployMetricViewResponse, operation_id="deployMetricView")
def deploy_metric_view(request: DeployMetricViewRequest, ws: Dependencies.Client) -> DeployMetricViewResponse:
    """Deploy a Metric View to Unity Catalog."""
    full_name = f"{request.catalog}.{request.schema_name}.{request.view_name}"
    sql = f"CREATE OR REPLACE VIEW {full_name}\nWITH METRICS\nLANGUAGE YAML\nAS $$\n{request.yaml_content}\n$$"

    try:
        warehouses = list(ws.warehouses.list())
        if not warehouses:
            return DeployMetricViewResponse(success=False, message="No SQL warehouses available.")

        warehouse_id = warehouses[0].id
        result = ws.statement_execution.execute_statement(
            warehouse_id=warehouse_id,
            statement=sql,
            wait_timeout="30s",
        )

        if result.status and result.status.state and result.status.state.value == "SUCCEEDED":
            return DeployMetricViewResponse(success=True, message=f"Metric view '{full_name}' created successfully.")
        else:
            error_msg = ""
            if result.status and result.status.error:
                error_msg = result.status.error.message or "Unknown error"
            return DeployMetricViewResponse(success=False, message=f"Deployment failed: {error_msg}")
    except Exception as e:
        return DeployMetricViewResponse(success=False, message=f"Deployment error: {str(e)}")
