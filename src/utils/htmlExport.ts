import { z } from "zod";

import { CanvasProject, ExportPayload, UIModule } from "@/types/planner";
import { buildModuleTree, ModuleNode } from "@/utils/moduleTree";

const moduleSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  semanticTag: z.enum([
    "section",
    "header",
    "main",
    "aside",
    "footer",
    "nav",
    "div",
  ]),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  zIndex: z.number(),
  locked: z.boolean(),
  visible: z.boolean(),
  accent: z.string(),
  parentId: z.string().nullable(),
  collapsed: z.boolean(),
});

const projectSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  width: z.number().positive(),
  height: z.number().positive(),
  backgroundImage: z.string().optional(),
  brief: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  modules: z.array(moduleSchema),
});

// 转义会破坏 HTML 结构或注入脚本的字符。导出物的全部价值在于「代码可读、可信」，
// 一旦用户在名称/描述里输入了 < " ' 等字符而不转义，导出的 HTML 就是坏的。
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// 注释里不能出现 --> （会提前闭合），换行也会破坏单行注释的可读性。
const escapeComment = (value: string) =>
  value.replace(/-->/g, "--›").replace(/\s*[\r\n]+\s*/g, " ").trim();

// class 名只用稳定的 block-N（见 buildExportPayload 里按序号分配）。
// 中文/任意名称一律放 data-name，避免「中文当 CSS 类名」这种不规范又让 AI 犹豫的写法。

// ---- 空间语义：位置 / 尺寸一律换算成「相对直接父容器的百分比」 ----
// 这是整份导出物对 AI 友好的关键，也是这次改版的核心。
//
// 为什么用百分比、且相对「父容器」而非画布：
//   1. 绝对像素（left:1055px）会把 AI 死钉在某个画布尺寸上——而作者只想让尺寸做参考、
//      不要等比复刻。百分比是「与尺寸无关的比例关系」，AI 拿它能在任意尺寸下还原同一版面。
//   2. 旧版的「方位文字」按画布算、但像素按父模块算，两者参照系不一致，容易让 AI
//      被笼统的「左侧/顶部」带偏、忽略作者真正画的精确排布。统一到「相对父容器」后，
//      文字方位与百分比同源，不再打架。
//
// 子模块的百分比都相对它的直接父模块；顶层模块相对整张画布。

// 区域宽/高达到容器 85% 视为通栏。
const FULL_SPAN_RATIO = 0.85;

// 把中心点占比映射到三分区：0=前(上/左) 1=中 2=后(下/右)。
const bandOf = (centerRatio: number) =>
  centerRatio < 1 / 3 ? 0 : centerRatio > 2 / 3 ? 2 : 1;

// 容器矩形：模块定位/百分比换算的参照系。顶层为画布，子模块为其直接父模块。
type Frame = { x: number; y: number; width: number; height: number };

type Placement = {
  // 给人看的一句话方位（如「顶部横向通栏」），作为快速导览，不作为精确依据。
  region: string;
  // 相对父容器的百分比矩形——这才是布局的精确依据。
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
};

const describePlacement = (module: UIModule, frame: Frame): Placement => {
  // 相对父容器原点的偏移与占比。
  const left = module.x - frame.x;
  const top = module.y - frame.y;
  const widthRatio = module.width / frame.width;
  const heightRatio = module.height / frame.height;
  const col = bandOf((left + module.width / 2) / frame.width);
  const row = bandOf((top + module.height / 2) / frame.height);

  const fullWidth = widthRatio >= FULL_SPAN_RATIO;
  const fullHeight = heightRatio >= FULL_SPAN_RATIO;

  let region: string;
  if (fullWidth && fullHeight) {
    region = "几乎铺满整个容器";
  } else if (fullWidth) {
    region = `${["顶部", "中部", "底部"][row]}横向通栏`;
  } else if (fullHeight) {
    region = `${["左", "中", "右"][col]}侧纵向通栏`;
  } else if (col === 1 && row === 1) {
    region = "正中央";
  } else {
    const vertical = ["顶部", "", "底部"][row];
    const horizontal = ["左侧", "", "右侧"][col];
    region = `${vertical}${horizontal}` || "中部";
  }

  return {
    region,
    leftPct: Math.round((left / frame.width) * 100),
    topPct: Math.round((top / frame.height) * 100),
    widthPct: Math.round(widthRatio * 100),
    heightPct: Math.round(heightRatio * 100),
  };
};

// 给每个模块分配稳定的 class 序号（block-1, block-2…），按树的深度优先顺序。
// 中文名进 data-name，class 永远是合法 ASCII，AI 和 CSS 都不会犯难。
type ClassMap = Map<string, number>;

const buildClassMap = (roots: ModuleNode[]): ClassMap => {
  const map: ClassMap = new Map();
  let counter = 0;
  const walk = (nodes: ModuleNode[]) => {
    for (const node of nodes) {
      counter += 1;
      map.set(node.id, counter);
      walk(node.children);
    }
  };
  walk(roots);
  return map;
};

// 递归渲染一个模块及其子树为嵌套 DOM。父模块的子模块直接写在它标签内部，
// 让导出的 HTML 结构本身就表达「分组/包含」关系——这是平铺 div 表达不出来的。
//
// 定位用「相对父容器的百分比」(见 describePlacement)：父模块 position:relative，
// 子模块 position:absolute + 百分比 left/top/width/height，于是无论容器多大，
// 子模块都按同样的比例落位——尺寸可变、版面不变。
const renderModuleNode = (
  node: ModuleNode,
  classMap: ClassMap,
  indent: string,
  // 本模块的直接父容器矩形（顶层为画布）。
  frame: Frame,
): string => {
  const tag = node.semanticTag;
  const description = node.description.trim();
  const safeName = escapeHtml(node.name);
  const classNo = classMap.get(node.id) ?? 0;
  const { region, leftPct, topPct, widthPct, heightPct } = describePlacement(
    node,
    frame,
  );

  const nesting =
    node.children.length > 0 ? ` · 含 ${node.children.length} 个子区域` : "";
  // 注释精简成「一行结构信息」：序号 + 名称 + 语义标签 + 精确百分比 + 方位导览。
  // 百分比在前、作为精确依据；方位词放括号里，仅供人快速扫读，不喧宾夺主。
  const comment = `${indent}<!-- [区域 ${classNo}] ${escapeComment(node.name)} · <${tag}> · 父内 左${leftPct}% 上${topPct}% · 宽${widthPct}% 高${heightPct}%（${region}）${nesting} -->`;

  // 说明文字只在这里出现一次（渲染时可见、读源码也可见），不再和注释重复。
  const note = description
    ? `\n${indent}  <p class="ui-block__note">${escapeHtml(description)}</p>`
    : "";

  // 子模块以当前节点矩形为新的参照系递归。
  const childFrame: Frame = {
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  };
  const childrenHtml = node.children
    .map((child) => renderModuleNode(child, classMap, `${indent}  `, childFrame))
    .join("\n");
  const childrenBlock = childrenHtml ? `\n${childrenHtml}` : "";

  return `${comment}
${indent}<${tag}
${indent}  class="ui-block block-${classNo}"
${indent}  data-name="${safeName}"
${indent}  data-region="${escapeHtml(region)}"
${indent}  style="left:${leftPct}%;top:${topPct}%;width:${widthPct}%;height:${heightPct}%;"
${indent}>
${indent}  <span class="ui-block__name">${safeName}</span>${note}${childrenBlock}
${indent}</${tag}>`;
};

// 文档顶部的「设计说明（DESIGN BRIEF）」。先给一张「结构地图」让模型建立整体认知，
// 再去读下方 DOM 的细节与说明。地图只放结构（名称 / 语义 / 相对父的百分比 / 嵌套），
// 不掺入用途长文——用途留在各区域内、只出现一次，避免地图过长难扫读。
const renderDesignBrief = (
  project: CanvasProject,
  roots: ModuleNode[],
  classMap: ClassMap,
  total: number,
): string => {
  const rows: string[] = [];
  const walk = (nodes: ModuleNode[], depth: number, frame: Frame) => {
    for (const node of nodes) {
      const classNo = classMap.get(node.id) ?? 0;
      const placement = describePlacement(node, frame);
      const nesting =
        node.children.length > 0
          ? ` · 含 ${node.children.length} 个子区域`
          : "";
      // 缩进在 escapeComment 之外拼接：escapeComment 会 trim 掉首尾空白，
      // 若把缩进放进去，分组层级的缩进会被吃掉，地图就和「缩进表示嵌套」的说明自相矛盾。
      // 顶层 4 空格起步，每深一层再加 2 空格。
      const indent = "    " + "  ".repeat(depth);
      const line = escapeComment(
        `${classNo}. ${node.name}  <${node.semanticTag}>  —  左${placement.leftPct}% 上${placement.topPct}% · 宽${placement.widthPct}% 高${placement.heightPct}%（${placement.region}）${nesting}`,
      );
      rows.push(`${indent}${line}`);
      walk(node.children, depth + 1, {
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      });
    }
  };
  walk(roots, 0, { x: 0, y: 0, width: project.width, height: project.height });

  const briefText = project.brief?.trim();
  const briefBlock = briefText
    ? [``, `  整体说明（作者写给 AI）：`, `    ${escapeComment(briefText)}`]
    : [];

  return [
    `<!--`,
    `  ============================================================`,
    `  ${escapeComment(project.name)} — UI 布局设计说明（DESIGN BRIEF）`,
    `  ============================================================`,
    `  这是一份「UI 规划稿」，描述各区域的相对位置、相对尺寸与用途。`,
    `  怎么读：先看下面的「区域地图」建立整体结构，再读 DOM 里每个区域的说明文字。`,
    ``,
    `  位置/尺寸约定（重要）：`,
    `    · 所有百分比都相对「直接父容器」——顶层区域相对整张画布，子区域相对它的父区域。`,
    `    · 百分比是布局的精确依据，请据此还原版面；像素画布尺寸仅供参考，无需等比复刻。`,
    `    · 缩进表示分组嵌套：子区域属于上一级父区域，应渲染在父区域内部。`,
    ...briefBlock,
    ``,
    `  参考画布尺寸：${project.width} × ${project.height} px（仅参考）`,
    `  区域总数：${total}`,
    ``,
    `  区域地图：`,
    ...rows,
    `  ============================================================`,
    `-->`,
  ].join("\n");
};

// 编辑中的项目会经历各种「合法的中间状态」——比如名字临时清空。导出函数在
// render 期间被调用（Editor 的 useMemo），所以它绝不能 throw，否则整页黑屏。
// 用 safeParse 而非 parse：校验失败不抛错，而是把数据规整成可安全导出的形态。
const sanitizeProject = (project: CanvasProject): CanvasProject => {
  const parsed = projectSchema.safeParse(project);
  if (parsed.success) {
    return parsed.data as CanvasProject;
  }

  // 校验失败（最常见是空名）时兜底：给空字符串补占位文本，保证导出始终可读。
  return {
    ...project,
    name: project.name.trim() || "未命名规划",
    modules: project.modules.map((module, index) => ({
      ...module,
      name: module.name.trim() || `未命名区域 ${index + 1}`,
    })),
  };
};

// 统计树里可见模块总数（含各层子孙）。
const countNodes = (roots: ModuleNode[]): number => {
  let count = 0;
  const walk = (nodes: ModuleNode[]) => {
    for (const node of nodes) {
      count += 1;
      walk(node.children);
    }
  };
  walk(roots);
  return count;
};

export const buildExportPayload = (project: CanvasProject): ExportPayload => {
  const validatedProject = sanitizeProject(project);
  // 只导出可见模块，并保留父子关系：先过滤再建树。
  const visibleModules = validatedProject.modules.filter(
    (module) => module.visible,
  );
  const roots = buildModuleTree(visibleModules);
  const classMap = buildClassMap(roots);
  const total = countNodes(roots);

  const canvasFrame: Frame = {
    x: 0,
    y: 0,
    width: validatedProject.width,
    height: validatedProject.height,
  };

  const html = [
    renderDesignBrief(validatedProject, roots, classMap, total),
    `<main class="ui-spec" aria-label="${escapeHtml(validatedProject.name)}">`,
    `  <div class="ui-spec__canvas">`,
    ...roots.map((node) =>
      renderModuleNode(node, classMap, "  ", canvasFrame),
    ),
    `  </div>`,
    `</main>`,
  ].join("\n");

  // 极简「线框规格」样式：背景一律透明，只用细边框勾出每块区域的轮廓与嵌套。
  // 没有页面底色、画布填充、区块填充、阴影、网格——那些对 AI 复刻布局零贡献，
  // 纯粹是视觉噪音。导出物的唯一目的是「结构清晰、AI 易读」，不是好看。
  // 子区域用百分比 + position:absolute 落在 position:relative 的父区域内，
  // 因此整套版面与容器实际像素无关，可在任意尺寸下按比例还原。
  const css = [
    "* { box-sizing: border-box; }",
    "body {",
    "  margin: 0;",
    "  font-family: 'Noto Sans SC', 'Segoe UI', system-ui, sans-serif;",
    "  color: #222;",
    "}",
    "",
    ".ui-spec {",
    "  padding: 24px;",
    "}",
    "",
    // 画布作为顶层定位上下文。给参考宽高，但用 max-width + aspect-ratio 让它能随屏缩放，
    // 强调「尺寸只是参考、比例才是布局」。背景透明、仅留虚线边框标示画布范围。
    ".ui-spec__canvas {",
    "  position: relative;",
    "  width: 100%;",
    `  max-width: ${validatedProject.width}px;`,
    `  aspect-ratio: ${validatedProject.width} / ${validatedProject.height};`,
    "  margin: 0 auto;",
    "  border: 1px dashed #bbb;",
    validatedProject.backgroundImage
      ? `  background-image: url('${validatedProject.backgroundImage}');`
      : "",
    validatedProject.backgroundImage
      ? "  background-size: cover; background-position: center;"
      : "",
    "}",
    "",
    // 线框区块：父区域同时是其子区域的定位上下文，所以这里 position:relative（由 absolute 隐式提供）。
    // 背景透明——嵌套时父子边框各自可见，层级关系一目了然，不靠填充色区分。
    ".ui-block {",
    "  position: absolute;",
    "  padding: 8px 10px;",
    "  border: 1px solid #888;",
    "}",
    "",
    ".ui-block__name {",
    "  display: block;",
    "  font-size: 12px;",
    "  font-weight: 600;",
    "  color: #222;",
    "  white-space: nowrap;",
    "  overflow: hidden;",
    "  text-overflow: ellipsis;",
    "}",
    "",
    ".ui-block__note {",
    "  margin: 4px 0 0;",
    "  font-size: 11px;",
    "  line-height: 1.55;",
    "  color: #666;",
    "}",
  ]
    .filter(Boolean)
    .join("\n");

  const document = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(validatedProject.name)} - UI 布局规格稿</title>
    <style>
${css}
    </style>
  </head>
  <body>
${html}
  </body>
</html>`;

  return {
    html,
    css,
    document,
  };
};
