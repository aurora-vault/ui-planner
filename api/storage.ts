import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 存储约定：扁平 JSON 文件，一个项目一个文件，文件即数据。
// data/projects/<id>.json 存完整工程快照（CanvasProject）。
// 不维护单独的 index.json——项目列表直接从目录里的文件现算，
// 避免「索引与文件不同步」这类最难查的 bug。个人工具量级下，
// 每次列表都重读全部文件的开销可忽略。

const here = dirname(fileURLToPath(import.meta.url));
// data/ 放在项目根（api/ 的上一级）。
const DATA_DIR = resolve(here, "..", "data");
const PROJECTS_DIR = join(DATA_DIR, "projects");

// 项目 id 是文件名的一部分，必须严格校验，防止 ../ 之类的路径穿越
// 把读写引到 projects 目录之外。只允许我们自己生成的字符集。
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export const isValidProjectId = (id: string): boolean => ID_PATTERN.test(id);

const projectPath = (id: string) => join(PROJECTS_DIR, `${id}.json`);

const ensureDir = async () => {
  await mkdir(PROJECTS_DIR, { recursive: true });
};

// 列表项只暴露「选项目」需要的元数据，不回传整份 modules，省带宽。
export type ProjectSummary = {
  id: string;
  name: string;
  width: number;
  height: number;
  moduleCount: number;
  updatedAt: string;
};

// 后端不强校验工程内部结构——前端的 zod 才是唯一权威校验源。
// 这里只把它当作「带 id/name/updatedAt 的不透明 JSON」来存取，
// 后端职责仅限于「安全地按 id 读写文件」。
type StoredProject = {
  id: string;
  name?: string;
  width?: number;
  height?: number;
  modules?: unknown[];
  updatedAt?: string;
  [key: string]: unknown;
};

const toSummary = (project: StoredProject): ProjectSummary => ({
  id: project.id,
  name: typeof project.name === "string" ? project.name : "未命名项目",
  width: typeof project.width === "number" ? project.width : 0,
  height: typeof project.height === "number" ? project.height : 0,
  moduleCount: Array.isArray(project.modules) ? project.modules.length : 0,
  updatedAt:
    typeof project.updatedAt === "string"
      ? project.updatedAt
      : new Date(0).toISOString(),
});

export const listProjects = async (): Promise<ProjectSummary[]> => {
  await ensureDir();
  const entries = await readdir(PROJECTS_DIR);
  const summaries: ProjectSummary[] = [];

  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    try {
      const raw = await readFile(join(PROJECTS_DIR, entry), "utf8");
      const project = JSON.parse(raw) as StoredProject;
      // 文件名（去掉 .json）才是权威 id，避免文件内容里的 id 与文件名不一致。
      const id = entry.slice(0, -".json".length);
      summaries.push(toSummary({ ...project, id }));
    } catch {
      // 单个文件损坏不应让整个列表请求失败——跳过它，其余项目照常返回。
      continue;
    }
  }

  // 最近更新的排在前面，符合「继续上次的工程」的直觉。
  summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return summaries;
};

export const readProject = async (
  id: string,
): Promise<StoredProject | null> => {
  if (!isValidProjectId(id)) return null;
  try {
    const raw = await readFile(projectPath(id), "utf8");
    const project = JSON.parse(raw) as StoredProject;
    return { ...project, id };
  } catch {
    return null;
  }
};

// 写文件用「先写临时文件再原子改名」，避免进程在写一半时崩溃导致
// 留下半截 JSON 文件（下次读取就会解析失败、丢数据）。
export const writeProject = async (
  id: string,
  project: StoredProject,
): Promise<StoredProject> => {
  if (!isValidProjectId(id)) {
    throw new Error("invalid project id");
  }
  await ensureDir();
  const payload: StoredProject = {
    ...project,
    id,
    updatedAt: new Date().toISOString(),
  };
  const tmp = projectPath(`${id}.tmp-${Date.now()}`);
  const target = projectPath(id);
  await writeFile(tmp, JSON.stringify(payload, null, 2), "utf8");
  // rename 在同一文件系统内是原子操作。
  const { rename } = await import("node:fs/promises");
  await rename(tmp, target);
  return payload;
};

export const deleteProject = async (id: string): Promise<boolean> => {
  if (!isValidProjectId(id)) return false;
  try {
    await rm(projectPath(id));
    return true;
  } catch {
    return false;
  }
};
