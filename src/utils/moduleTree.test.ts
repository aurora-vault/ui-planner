import { describe, expect, it } from "vitest";

import { UIModule } from "@/types/planner";
import {
  collectDescendantIds,
  getAncestorPath,
  resolveDropParent,
  wouldCreateCycle,
} from "@/utils/moduleTree";

const makeModule = (over: Partial<UIModule>): UIModule => ({
  id: "m",
  name: "区域",
  description: "",
  semanticTag: "div",
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  zIndex: 1,
  locked: false,
  visible: true,
  accent: "#22c55e",
  parentId: null,
  collapsed: false,
  ...over,
});

describe("moduleTree", () => {
  it("resolveDropParent：拖到与目标大面积重叠时合并为其子模块", () => {
    const modules = [
      makeModule({ id: "target", x: 0, y: 0, width: 400, height: 400 }),
      // dragged 几乎完全落在 target 内（重叠 > 50% 阈值）
      makeModule({ id: "dragged", x: 20, y: 20, width: 100, height: 100 }),
    ];

    expect(resolveDropParent(modules, "dragged")).toBe("target");
  });

  it("resolveDropParent：几乎无重叠时回到顶层（parentId=null）", () => {
    const modules = [
      makeModule({ id: "target", x: 0, y: 0, width: 200, height: 200 }),
      makeModule({ id: "dragged", x: 600, y: 600, width: 100, height: 100 }),
    ];

    expect(resolveDropParent(modules, "dragged")).toBeNull();
  });

  it("resolveDropParent：候选优先更深层，便于嵌进子模块", () => {
    const modules = [
      makeModule({ id: "outer", x: 0, y: 0, width: 500, height: 500 }),
      makeModule({
        id: "inner",
        parentId: "outer",
        x: 0,
        y: 0,
        width: 300,
        height: 300,
      }),
      // dragged 同时重叠 outer 与 inner，应挑更深的 inner
      makeModule({ id: "dragged", x: 10, y: 10, width: 100, height: 100 }),
    ];

    expect(resolveDropParent(modules, "dragged")).toBe("inner");
  });

  it("resolveDropParent：不会把模块挂到自身的子孙上（防环）", () => {
    const modules = [
      makeModule({ id: "parent", x: 0, y: 0, width: 400, height: 400 }),
      // child 落在 parent 内，但 parent 是 child 的父——拖 parent 时不能挂到 child
      makeModule({
        id: "child",
        parentId: "parent",
        x: 0,
        y: 0,
        width: 380,
        height: 380,
      }),
    ];

    expect(resolveDropParent(modules, "parent")).toBeNull();
  });

  it("wouldCreateCycle：挂到自身或子孙下视为成环", () => {
    const modules = [
      makeModule({ id: "a" }),
      makeModule({ id: "b", parentId: "a" }),
    ];

    expect(wouldCreateCycle(modules, "a", "a")).toBe(true);
    expect(wouldCreateCycle(modules, "a", "b")).toBe(true);
    expect(wouldCreateCycle(modules, "b", null)).toBe(false);
  });

  it("collectDescendantIds 与 getAncestorPath 在多层嵌套下正确", () => {
    const modules = [
      makeModule({ id: "root", name: "根" }),
      makeModule({ id: "mid", name: "中", parentId: "root" }),
      makeModule({ id: "leaf", name: "叶", parentId: "mid" }),
    ];

    expect(collectDescendantIds(modules, "root").sort()).toEqual(["leaf", "mid"]);
    expect(getAncestorPath(modules, "leaf")).toEqual(["根", "中"]);
  });
});
