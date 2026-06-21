import { UIModule } from "@/types/planner";

// 模块以「平铺数组 + parentId 指针」存储，而非真正的嵌套数组。
// 原因：画布渲染、拖拽、z 序都按平铺处理最简单；嵌套只是「视图」，
// 需要时用下面的工具按 parentId 现算出树。存储平铺、展示成树。

export type ModuleNode = UIModule & {
  depth: number;
  children: ModuleNode[];
  // 从根到「本节点父级」的名称路径（不含自身）。用于图层栏里子模块展示嵌套路径，
  // 让深层子模块也能一眼看出归属。顶层模块为空数组。
  path: string[];
};

const byId = (modules: UIModule[]) =>
  new Map(modules.map((module) => [module.id, module]));

// 按 parentId 构建树。每个节点带 depth（用于图层栏缩进）和 children。
// 同层按 zIndex 升序（与画布层级一致）。
export const buildModuleTree = (modules: UIModule[]): ModuleNode[] => {
  const nodes = new Map<string, ModuleNode>(
    modules.map((module) => [
      module.id,
      { ...module, depth: 0, children: [], path: [] },
    ]),
  );
  const roots: ModuleNode[] = [];

  for (const node of nodes.values()) {
    const parent =
      node.parentId != null ? nodes.get(node.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRec = (list: ModuleNode[], depth: number, parentPath: string[]) => {
    list.sort((a, b) => a.zIndex - b.zIndex);
    for (const node of list) {
      node.depth = depth;
      node.path = parentPath;
      sortRec(node.children, depth + 1, [...parentPath, node.name]);
    }
  };
  sortRec(roots, 0, []);

  return roots;
};

// 把树拍平成「图层栏顺序」的列表：父在前、子紧随其后（深度优先）。
// collapsed 的父模块，其子树整体跳过（折叠效果）。
export const flattenForLayers = (modules: UIModule[]): ModuleNode[] => {
  const out: ModuleNode[] = [];
  const walk = (list: ModuleNode[]) => {
    for (const node of list) {
      out.push(node);
      if (!node.collapsed) {
        walk(node.children);
      }
    }
  };
  walk(buildModuleTree(modules));
  return out;
};

// 求某模块的全部子孙 id（含多层嵌套）。删除父模块时需连带处理子孙。
export const collectDescendantIds = (
  modules: UIModule[],
  rootId: string,
): string[] => {
  const childrenByParent = new Map<string, UIModule[]>();
  for (const module of modules) {
    if (module.parentId != null) {
      const list = childrenByParent.get(module.parentId) ?? [];
      list.push(module);
      childrenByParent.set(module.parentId, list);
    }
  }

  const result: string[] = [];
  const stack = [rootId];
  while (stack.length) {
    const current = stack.pop()!;
    for (const child of childrenByParent.get(current) ?? []) {
      result.push(child.id);
      stack.push(child.id);
    }
  }
  return result;
};

// 求从根到目标模块的祖先路径名（用于「子模块显示嵌套路径」需求）。
export const getAncestorPath = (
  modules: UIModule[],
  moduleId: string,
): string[] => {
  const map = byId(modules);
  const path: string[] = [];
  let current = map.get(moduleId);
  // 防御性上限，避免坏数据形成的环导致死循环。
  let guard = 0;
  while (current?.parentId != null && guard < 1000) {
    const parent = map.get(current.parentId);
    if (!parent) break;
    path.unshift(parent.name);
    current = parent;
    guard += 1;
  }
  return path;
};

// 判断把 moduleId 挂到 candidateParentId 下是否会形成环
// （不能把模块挂到它自己的子孙上，否则树断裂）。
export const wouldCreateCycle = (
  modules: UIModule[],
  moduleId: string,
  candidateParentId: string | null,
): boolean => {
  if (candidateParentId == null) return false;
  if (candidateParentId === moduleId) return true;
  const descendants = collectDescendantIds(modules, moduleId);
  return descendants.includes(candidateParentId);
};

// 两个矩形的重叠面积占「被拖拽模块」面积的比例。
// 画布拖拽合并用：拖拽中重叠超过阈值即视为「拖进某模块」→ 合并为其子模块。
export const overlapRatio = (dragged: UIModule, target: UIModule): number => {
  const ix = Math.max(
    0,
    Math.min(dragged.x + dragged.width, target.x + target.width) -
      Math.max(dragged.x, target.x),
  );
  const iy = Math.max(
    0,
    Math.min(dragged.y + dragged.height, target.y + target.height) -
      Math.max(dragged.y, target.y),
  );
  const interArea = ix * iy;
  const draggedArea = dragged.width * dragged.height;
  return draggedArea > 0 ? interArea / draggedArea : 0;
};

// 拖拽结束时，根据位置决定被拖拽模块应挂到哪个父模块下（或解除嵌套）。
// 规则：在所有「非自身、非自身子孙」的候选里，挑重叠比例最高且超过阈值的；
// 都不达标则置为顶层（parentId=null）。候选优先选更深的，便于嵌进子模块。
const MERGE_THRESHOLD = 0.5;

export const resolveDropParent = (
  modules: UIModule[],
  draggedId: string,
): string | null => {
  const dragged = modules.find((m) => m.id === draggedId);
  if (!dragged) return null;

  const descendants = new Set(collectDescendantIds(modules, draggedId));
  const tree = buildModuleTree(modules);
  const depthOf = new Map<string, number>();
  const walk = (nodes: ModuleNode[]) => {
    for (const node of nodes) {
      depthOf.set(node.id, node.depth);
      walk(node.children);
    }
  };
  walk(tree);

  let best: { id: string; ratio: number; depth: number } | null = null;
  for (const candidate of modules) {
    if (candidate.id === draggedId || descendants.has(candidate.id)) continue;
    const ratio = overlapRatio(dragged, candidate);
    if (ratio < MERGE_THRESHOLD) continue;
    const depth = depthOf.get(candidate.id) ?? 0;
    if (
      !best ||
      depth > best.depth ||
      (depth === best.depth && ratio > best.ratio)
    ) {
      best = { id: candidate.id, ratio, depth };
    }
  }

  return best ? best.id : null;
};
