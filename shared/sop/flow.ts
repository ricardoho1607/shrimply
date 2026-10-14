import type { SopDefinition } from "./contracts";
export function sopFlow(definition: SopDefinition) {
  const nodes = definition.steps.map((s, i) => ({
    id: s.id,
    title: s.title,
    x: 24,
    y: 24 + i * 92,
    width: 330,
    height: 60,
  }));
  const edges = definition.steps.flatMap((s) => [
    ...s.onPass.map((to) => ({
      from: s.id,
      to,
      label: "Pass",
      color: "#0F4C75",
    })),
    ...s.onFail.map((to) => ({
      from: s.id,
      to,
      label: "Failure",
      color: "#e74c3c",
    })),
    ...s.dependsOn.map((from) => ({
      from,
      to: s.id,
      label: "Requires",
      color: "#526b7d",
    })),
  ]);
  return {
    nodes,
    edges,
    width: 580,
    height: Math.max(100, nodes.length * 92 + 24),
  };
}
