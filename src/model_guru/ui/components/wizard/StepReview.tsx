import { useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWizard } from "@/lib/wizard-context";
import { useGenerateMetricView } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

function TableNode({
  data,
}: {
  data: { label: string; columns: string[]; isSource: boolean };
}) {
  return (
    <div className="bg-card border-2 rounded-lg shadow-md min-w-[200px]" style={{ borderColor: data.isSource ? 'hsl(var(--primary))' : 'hsl(var(--border))' }}>
      <Handle type="target" position={Position.Top} style={{ background: '#FF3621', width: 8, height: 8 }} />
      <div className={`px-3 py-2 rounded-t-md font-semibold text-sm ${data.isSource ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
        {data.label}
      </div>
      <div className="px-3 py-2 space-y-1">
        {data.columns.map((col) => (
          <div key={col} className="text-xs font-mono text-muted-foreground">
            {col}
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#FF3621', width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { tableNode: TableNode };

export function StepReview() {
  const {
    confirmedMappings,
    sourceTable,
    yamlContent,
    setYamlContent,
    erdNodes,
    erdEdges,
    setErd,
    setStep,
  } = useWizard();
  const [isEditing, setIsEditing] = useState(false);
  const [editableYaml, setEditableYaml] = useState("");
  const generateMutation = useGenerateMetricView();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const generate = async () => {
      try {
        const result = await generateMutation.mutateAsync({
          confirmed_mappings: confirmedMappings,
          source_table: sourceTable,
          view_name: "metric_view",
        });
        setYamlContent(result.data.yaml_content);
        setEditableYaml(result.data.yaml_content);
        setErd(result.data.erd.nodes, result.data.erd.edges);
      } catch (e) {
        console.error("Failed to generate metric view:", e);
      }
    };
    generate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update React Flow state when ERD data changes
  useEffect(() => {
    if (erdNodes.length === 0) return;

    // Layout: source table centered on top, dims spread below
    const sourceIdx = erdNodes.findIndex((n) => n.id === sourceTable || n.table_name === sourceTable);
    const dimNodes = erdNodes.filter((_, i) => i !== sourceIdx);

    const newNodes: Node[] = [];

    // Source node centered
    if (sourceIdx >= 0) {
      const node = erdNodes[sourceIdx];
      newNodes.push({
        id: node.id,
        type: "tableNode",
        position: { x: Math.max(0, (dimNodes.length - 1) * 140), y: 0 },
        data: {
          label: node.table_name.split(".").pop() || node.table_name,
          columns: node.columns,
          isSource: true,
        },
      });
    }

    // Dim nodes in a row below
    dimNodes.forEach((node, i) => {
      newNodes.push({
        id: node.id,
        type: "tableNode",
        position: { x: i * 280, y: 250 },
        data: {
          label: node.table_name.split(".").pop() || node.table_name,
          columns: node.columns,
          isSource: false,
        },
      });
    });

    // Build edges — try exact match first, then fall back to matching by table_name
    const nodeIdSet = new Set(newNodes.map((n) => n.id));
    const nodeByName = new Map(
      newNodes.map((n) => [n.data.label, n.id] as const),
    );
    const nodeByFullName = new Map(
      erdNodes.map((n) => [n.table_name, n.id] as const),
    );

    const resolveId = (ref: string): string | undefined => {
      if (nodeIdSet.has(ref)) return ref;
      // Try matching by short name
      const shortName = ref.split(".").pop() || ref;
      if (nodeByName.has(shortName)) return nodeByName.get(shortName);
      // Try matching by full table name
      if (nodeByFullName.has(ref)) {
        const resolved = nodeByFullName.get(ref);
        if (resolved && nodeIdSet.has(resolved)) return resolved;
      }
      return undefined;
    };

    const newEdges: Edge[] = erdEdges
      .map((edge, i) => {
        const sourceId = resolveId(edge.source);
        const targetId = resolveId(edge.target);
        if (!sourceId || !targetId) return null;
        return {
          id: `e-${i}`,
          source: sourceId,
          target: targetId,
          label: `${edge.source_column} = ${edge.target_column}`,
          type: "smoothstep",
          animated: true,
          style: { stroke: "#FF3621", strokeWidth: 2 },
          labelStyle: { fontSize: 11, fontFamily: "monospace", fill: "#ff8c73" },
          labelBgStyle: { fill: "#1a1a2e", fillOpacity: 0.8 },
          labelBgPadding: [6, 4] as [number, number],
          markerStart: { type: "arrow" as const, color: "#FF3621" },
          markerEnd: { type: "arrowclosed" as const, color: "#FF3621" },
        };
      })
      .filter(Boolean) as Edge[];

    setNodes(newNodes);
    setEdges(newEdges);
  }, [erdNodes, erdEdges, sourceTable, setNodes, setEdges]);

  const handleSaveYaml = () => {
    setYamlContent(editableYaml);
    setIsEditing(false);
  };

  if (generateMutation.isPending) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            <p className="text-muted-foreground">
              Generating Metric View YAML...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Entity Relationship Diagram</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] border rounded-lg" style={{ background: "#1a1a2e" }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              colorMode="dark"
            >
              <Background />
              <Controls />
            </ReactFlow>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Metric View YAML</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                isEditing ? handleSaveYaml() : setIsEditing(true)
              }
            >
              {isEditing ? "Save" : "Edit"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              className="font-mono text-sm min-h-[384px]"
              value={editableYaml}
              onChange={(e) => setEditableYaml(e.target.value)}
              rows={20}
            />
          ) : (
            <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-sm font-mono whitespace-pre-wrap">
              {yamlContent}
            </pre>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep("map")}>
          Back
        </Button>
        <Button onClick={() => setStep("deploy")}>Deploy to Databricks</Button>
      </div>
    </div>
  );
}
