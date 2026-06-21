import { CanvasProject } from "@/types/planner";

// 前端 API 客户端：与 api/server.ts 的 /api/projects 接口对接。
// 后端只做「按 id 安全读写 JSON 文件」，不校验工程内部结构——
// 所以这里读回的数据仍需上层（store/zod）当作不可信输入对待。

// 列表项：选项目下拉只需要这些元数据，不含完整 modules。
export type ProjectSummary = {
  id: string;
  name: string;
  width: number;
  height: number;
  moduleCount: number;
  updatedAt: string;
};

// 统一的请求封装：非 2xx 一律抛出带后端 error 文案的异常，
// 让调用方用一句 try/catch 给用户友好提示，而不是各处零散判断 res.ok。
const request = async <T>(
  url: string,
  init?: RequestInit,
): Promise<T> => {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // 后端理论上总回 JSON；解析失败时下面按状态码兜底报错。
  }

  if (!res.ok) {
    const message =
      json && typeof json === "object" && "error" in json
        ? String((json as { error: unknown }).error)
        : `请求失败（HTTP ${res.status}）`;
    throw new Error(message);
  }

  return json as T;
};

export const fetchProjectList = async (): Promise<ProjectSummary[]> => {
  const data = await request<{ projects: ProjectSummary[] }>("/api/projects");
  return data.projects ?? [];
};

export const fetchProject = async (id: string): Promise<CanvasProject> => {
  const data = await request<{ project: CanvasProject }>(
    `/api/projects/${encodeURIComponent(id)}`,
  );
  return data.project;
};

// 新建：后端生成 id 并回传带 id 的完整工程。
export const createProject = async (
  project: CanvasProject,
): Promise<CanvasProject> => {
  const data = await request<{ project: CanvasProject }>("/api/projects", {
    method: "POST",
    body: JSON.stringify({ project }),
  });
  return data.project;
};

// 保存：按 id 覆盖写。后端会刷新 updatedAt 并回传。
export const saveProject = async (
  id: string,
  project: CanvasProject,
): Promise<CanvasProject> => {
  const data = await request<{ project: CanvasProject }>(
    `/api/projects/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify({ project }),
    },
  );
  return data.project;
};

export const deleteProject = async (id: string): Promise<void> => {
  await request(`/api/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};
