import { useEffect, useMemo, useState } from "react";
import type { AstNode } from "../types";

type Props = {
  node: AstNode;
  onSelect: (node: AstNode) => void;
  selectedId?: string;
};

function TreeItem({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: AstNode;
  depth: number;
  selectedId?: string;
  onSelect: (node: AstNode) => void;
}) {
  const hasChildren = node.children.length > 0;
  const [expanded, setExpanded] = useState(depth < 2);
  const isSelected = selectedId === node.id;

  useEffect(() => {
    setExpanded(depth < 2);
  }, [depth, node.id]);

  const label = useMemo(() => {
    const name = node.name ? ` (${node.name})` : "";
    return `${node.kind}${name}`;
  }, [node.kind, node.name]);

  return (
    <div className="tree-node">
      <div
        className="tree-node-row"
        style={{
          marginLeft: depth * 16,
          borderLeft: depth > 0 ? "1px solid #273244" : "none",
          paddingLeft: depth > 0 ? 10 : 0,
        }}
      >
        <button
          onClick={() => hasChildren && setExpanded((v) => !v)}
          className="tree-toggle"
          aria-label={expanded ? "collapse" : "expand"}
        >
          {hasChildren ? (expanded ? "▾" : "▸") : "·"}
        </button>

        <button
          onClick={() => {
            if (hasChildren) setExpanded((v) => !v);
            onSelect(node);
          }}
          className={`tree-label ${isSelected ? "tree-label-selected" : ""}`}
        >
          <div className="tree-label-title">
            {label}
            <span className="tree-node-type">{node.node_type}</span>
          </div>
          {node.path && <div className="tree-path">{node.path}</div>}
        </button>
      </div>

      {expanded &&
        node.children.map((child) => (
          <TreeItem
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

export function AstTree({ node, onSelect, selectedId }: Props) {
  return <TreeItem node={node} depth={0} selectedId={selectedId} onSelect={onSelect} />;
}
