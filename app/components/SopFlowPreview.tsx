import React from "react";
import { ScrollView } from "react-native";
import Svg, { Rect, Path, Text as SvgText } from "react-native-svg";
import type { SopDefinition } from "../../shared/sop/contracts";
import { sopFlow } from "../../shared/sop/flow";
export function SopFlowPreview({ definition }: { definition: SopDefinition }) {
  const flow = sopFlow(definition);
  return (
    <ScrollView horizontal>
      <Svg
        width={flow.width}
        height={flow.height}
        accessibilityLabel="Read-only SOP workflow"
        viewBox={`0 0 ${flow.width} ${flow.height}`}
      >
        {flow.edges.map((e, i) => {
          const a = flow.nodes.find((n) => n.id === e.from),
            b = flow.nodes.find((n) => n.id === e.to);
          if (!a || !b) return null;
          const x = 390 + (i % 4) * 40;
          return (
            <React.Fragment key={`${e.from}-${e.to}-${e.label}`}>
              <Path
                d={`M ${a.x + a.width} ${a.y + 30} C ${x} ${a.y + 30}, ${x} ${b.y + 30}, ${b.x + b.width} ${b.y + 30}`}
                stroke={e.color}
                fill="none"
                strokeWidth={2}
              />
              <SvgText
                x={x}
                y={(a.y + b.y) / 2 + 25}
                fill={e.color}
                fontSize={12}
              >
                {e.label}
              </SvgText>
            </React.Fragment>
          );
        })}
        {flow.nodes.map((n, i) => (
          <React.Fragment key={n.id}>
            <Rect
              x={n.x}
              y={n.y}
              width={n.width}
              height={n.height}
              rx={10}
              fill="#eaf4fb"
              stroke="#cbdde8"
            />
            <SvgText x={n.x + 14} y={n.y + 35} fill="#0F4C75" fontSize={15}>
              {i + 1}.{" "}
              {n.title.length > 36 ? n.title.slice(0, 33) + "…" : n.title}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </ScrollView>
  );
}
