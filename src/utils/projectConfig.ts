import { z } from "zod";

import { CanvasProject, ProjectConfigFile } from "@/types/planner";

// 配置文件（.json）与导出的 .html 成品严格分离：
// .html 是给 AI 读的纯净成品，.json 是可被重新导入复写的完整工程快照。
// 这里负责「工程 ↔ 配置文件」的序列化与带校验的反序列化。

const CONFIG_FORMAT = "ui-planner-config" as const;
const CONFIG_VERSION = 1 as const;

const moduleSchema = z.object({
  id: z.string(),
  name: z.string(),
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
  width: z.number(),
  height: z.number(),
  zIndex: z.number(),
  locked: z.boolean(),
  visible: z.boolean(),
  accent: z.string(),
  parentId: z.string().nullable(),
  collapsed: z.boolean(),
});

const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
  backgroundImage: z.string().optional(),
  brief: z.string().optional(),
  modules: z.array(moduleSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const configSchema = z.object({
  format: z.literal(CONFIG_FORMAT),
  version: z.literal(CONFIG_VERSION),
  exportedAt: z.string(),
  project: projectSchema,
});

// 把当前工程打包成配置文件对象（带 format/version 标记，便于导入时识别）。
export const buildProjectConfig = (
  project: CanvasProject,
): ProjectConfigFile => ({
  format: CONFIG_FORMAT,
  version: CONFIG_VERSION,
  exportedAt: new Date().toISOString(),
  project,
});

// 序列化为带缩进的 JSON 文本，方便人工查看 / diff。
export const serializeProjectConfig = (project: CanvasProject): string =>
  JSON.stringify(buildProjectConfig(project), null, 2);

// 用「两字段都恒在」的结果形态，而非可辨识联合：本项目 tsconfig 关了
// strictNullChecks（strict:false），联合类型的 result.ok 收窄不可靠，
// 会误报 error 不存在。project 非 null 即成功，否则 error 给出失败原因。
export type ParseConfigResult = {
  project: CanvasProject | null;
  error: string | null;
};

// 解析导入的配置文件文本。任何格式问题都以 error 返回而非抛错，
// 让上层用一句友好的中文提示告知用户，绝不让坏文件把界面打崩。
export const parseProjectConfig = (raw: string): ParseConfigResult => {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { project: null, error: "不是有效的 JSON 文件" };
  }

  const parsed = configSchema.safeParse(json);
  if (!parsed.success) {
    return {
      project: null,
      error: "文件不是有效的 UI Planner 配置（缺少必要字段或格式不符）",
    };
  }

  // 导入是用户主动选取的文件，原样恢复工程；不重置子模块的父子关系，
  // 因为配置文件本身就是完整快照（含 parentId/collapsed）。
  return { project: parsed.data.project as CanvasProject, error: null };
};
