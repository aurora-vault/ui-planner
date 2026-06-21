export type SemanticTag =
  | "section"
  | "header"
  | "main"
  | "aside"
  | "footer"
  | "nav"
  | "div";

export type UIModule = {
  id: string;
  name: string;
  description: string;
  semanticTag: SemanticTag;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  locked: boolean;
  visible: boolean;
  accent: string;
  // 分组嵌套：parentId 为 null 表示顶层模块，否则指向父模块的 id。
  // x/y 始终是「相对画布」的绝对坐标，渲染/拖拽不依赖父子关系换算，
  // 父子只表达「分组语义」（导出时体现为 DOM 嵌套、图层栏体现为缩进树）。
  parentId: string | null;
  // 作为父模块时，是否在图层栏折叠隐藏其子模块。叶子模块此值无意义。
  collapsed: boolean;
};

export type CanvasProject = {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundImage?: string;
  // 写给 AI 看的整体说明（对应规划区域13「页面标题下拉填更多描述」）。
  brief?: string;
  modules: UIModule[];
  createdAt: string;
  updatedAt: string;
};

export type ModuleDraft = Pick<
  UIModule,
  "name" | "description" | "semanticTag" | "x" | "y" | "width" | "height"
> & {
  accent?: string;
  parentId?: string | null;
};

// 配置文件（.json）：完整工程快照，可被重新导入复写、可多项目切换。
// 与导出的 .html 成品严格分离——成品保持纯净、AI 易读，不混入工程元数据。
export type ProjectConfigFile = {
  format: "ui-planner-config";
  version: 1;
  exportedAt: string;
  project: CanvasProject;
};

export type ExportPayload = {
  html: string;
  css: string;
  document: string;
};
