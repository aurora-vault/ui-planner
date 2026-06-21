import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { nanoid } from "nanoid";

import {
  deleteProject,
  isValidProjectId,
  listProjects,
  readProject,
  writeProject,
} from "./storage.ts";

// 零依赖 HTTP 服务（node:http）。只负责按 id 安全读写 data/projects 下的 JSON 文件，
// 不碰工程内部结构校验——那是前端 zod 的职责。仅供本地个人使用，因此默认绑 127.0.0.1。

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "127.0.0.1";

const sendJson = (res: ServerResponse, status: number, body: unknown) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
};

// 请求体可能很大（含 base64 背景图），设一个上限防止异常巨包打爆内存。
const MAX_BODY = 16 * 1024 * 1024; // 16MB

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolvePromise, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolvePromise(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });

const handler = async (req: IncomingMessage, res: ServerResponse) => {
  const { method = "GET" } = req;
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const path = url.pathname;

  // GET /api/projects —— 列表（仅元数据）
  if (path === "/api/projects" && method === "GET") {
    const projects = await listProjects();
    return sendJson(res, 200, { projects });
  }

  // POST /api/projects —— 新建：生成 id，存入请求体里的工程
  if (path === "/api/projects" && method === "POST") {
    let body: { project?: Record<string, unknown> };
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      return sendJson(res, 400, { error: "请求体不是有效的 JSON" });
    }
    if (!body.project || typeof body.project !== "object") {
      return sendJson(res, 400, { error: "缺少 project 字段" });
    }
    const id = nanoid(10);
    const saved = await writeProject(id, { ...body.project, id });
    return sendJson(res, 201, { project: saved });
  }

  // /api/projects/:id —— 单项目读 / 写 / 删
  const match = path.match(/^\/api\/projects\/([^/]+)$/);
  if (match) {
    const id = decodeURIComponent(match[1]);
    if (!isValidProjectId(id)) {
      return sendJson(res, 400, { error: "非法的项目 id" });
    }

    if (method === "GET") {
      const project = await readProject(id);
      if (!project) return sendJson(res, 404, { error: "项目不存在" });
      return sendJson(res, 200, { project });
    }

    if (method === "PUT") {
      let body: { project?: Record<string, unknown> };
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        return sendJson(res, 400, { error: "请求体不是有效的 JSON" });
      }
      if (!body.project || typeof body.project !== "object") {
        return sendJson(res, 400, { error: "缺少 project 字段" });
      }
      const saved = await writeProject(id, { ...body.project, id });
      return sendJson(res, 200, { project: saved });
    }

    if (method === "DELETE") {
      const ok = await deleteProject(id);
      if (!ok) return sendJson(res, 404, { error: "项目不存在" });
      return sendJson(res, 200, { ok: true });
    }
  }

  sendJson(res, 404, { error: "未找到该接口" });
};

const server = createServer((req, res) => {
  handler(req, res).catch((error) => {
    // 兜底：任何未捕获的异常都回 500，绝不让连接挂死。
    const message = error instanceof Error ? error.message : "服务器内部错误";
    sendJson(res, 500, { error: message });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[api] UI Planner 存储服务运行于 http://${HOST}:${PORT}`);
});
