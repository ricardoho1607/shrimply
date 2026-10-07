"use client";
import type { SopDefinition } from "../../../shared/sop/contracts";
import { sopFlow } from "../../../shared/sop/flow";
export function SopFlowPreview({ definition }: { definition: SopDefinition }) {
  const flow = sopFlow(definition);
  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        role="img"
        aria-label="Read-only SOP workflow: pass, failure, and prerequisite connections"
        viewBox={`0 0 ${flow.width} ${flow.height}`}
        style={{ minWidth: 580, width: "100%", maxWidth: 720 }}
      >
        <defs>
          <marker
            id="sop-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#526b7d" />
          </marker>
        </defs>
        {flow.edges.map((e, i) => {
          const a = flow.nodes.find((n) => n.id === e.from),
            b = flow.nodes.find((n) => n.id === e.to);
          if (!a || !b) return null;
          const x = 390 + (i % 4) * 40;
          return (
            <g key={`${e.from}-${e.to}-${e.label}`}>
              <path
                d={`M ${a.x + a.width} ${a.y + 30} C ${x} ${a.y + 30}, ${x} ${b.y + 30}, ${b.x + b.width} ${b.y + 30}`}
                stroke={e.color}
                fill="none"
                strokeWidth="2"
                markerEnd="url(#sop-arrow)"
              />
              <text x={x} y={(a.y + b.y) / 2 + 25} fill={e.color} fontSize="12">
                {e.label}
              </text>
            </g>
          );
        })}
        {flow.nodes.map((n, i) => (
          <g key={n.id}>
            <rect
              x={n.x}
              y={n.y}
              width={n.width}
              height={n.height}
              rx="10"
              fill="#eaf4fb"
              stroke="#cbdde8"
            />
            <text x={n.x + 14} y={n.y + 35} fill="#0F4C75" fontSize="15">
              {i + 1}.{" "}
              {n.title.length > 36 ? n.title.slice(0, 33) + "…" : n.title}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
