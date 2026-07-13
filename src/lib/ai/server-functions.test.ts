import { describe, expect, it } from "vitest";
import {
  dedupeFlatIds,
  dedupeNodeIdsRecursive,
} from "@/lib/ai/server-functions";
import type { RoadmapNode } from "@/lib/ai/schemas";

function leaf(id: string, children: RoadmapNode[] = []): RoadmapNode {
  return {
    id,
    title: id,
    kind: "topic",
    status: "missing",
    priority: null,
    difficulty: null,
    estimatedEffort: null,
    evidenceRequired: null,
    recommendedAction: null,
    children,
  };
}

describe("dedupeFlatIds", () => {
  it(
    "renames colliding branch ids instead of leaving duplicates " +
      "(this is the exact production bug: two roadmap branches both returned by the model " +
      "with id 'tools' caused a React key collision that silently dropped one of them from " +
      "the rendered tree, even though both were genuinely generated)",
    () => {
      const branches = [
        { id: "tools" },
        { id: "core-domain" },
        { id: "tools" },
        { id: "tools" },
      ];
      dedupeFlatIds(branches);
      const ids = branches.map((b) => b.id);
      expect(new Set(ids).size).toBe(ids.length); // all unique
      expect(ids).toEqual(["tools", "core-domain", "tools-2", "tools-3"]);
    },
  );

  it("leaves already-unique ids untouched", () => {
    const branches = [{ id: "a" }, { id: "b" }, { id: "c" }];
    dedupeFlatIds(branches);
    expect(branches.map((b) => b.id)).toEqual(["a", "b", "c"]);
  });

  it("falls back to a placeholder base name for an empty id instead of colliding on ''", () => {
    const branches = [{ id: "" }, { id: "" }];
    dedupeFlatIds(branches);
    const ids = branches.map((b) => b.id);
    expect(new Set(ids).size).toBe(2);
    expect(ids[0]).toBe("node");
    expect(ids[1]).toBe("node-2");
  });

  it("honors a seeded 'seen' set (e.g. reserving 'root' for the tree's actual root node)", () => {
    const branches = [{ id: "root" }, { id: "interview-prep" }];
    dedupeFlatIds(branches, new Set(["root"]));
    expect(branches.map((b) => b.id)).toEqual(["root-2", "interview-prep"]);
  });
});

describe("dedupeNodeIdsRecursive", () => {
  it("dedupes ids across an entire tree, not just within one level", () => {
    const tree: RoadmapNode[] = [
      leaf("skill", [leaf("skill"), leaf("advanced")]),
      leaf("skill", [leaf("advanced")]),
    ];
    dedupeNodeIdsRecursive(tree);

    const allIds: string[] = [];
    function collect(nodes: RoadmapNode[]) {
      for (const n of nodes) {
        allIds.push(n.id);
        collect(n.children);
      }
    }
    collect(tree);

    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("respects a seeded 'seen' set so a child can't collide with its parent branch's id", () => {
    const tree: RoadmapNode[] = [leaf("cloud-deployment")];
    dedupeNodeIdsRecursive(tree, new Set(["cloud-deployment"]));
    expect(tree[0].id).toBe("cloud-deployment-2");
  });
});
