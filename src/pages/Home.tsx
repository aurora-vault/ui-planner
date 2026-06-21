import { ArrowRight, Blocks, Code2, ScanLine, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { usePlannerStore } from "@/store/usePlannerStore";

const highlights = [
  {
    title: "自由框选规划",
    description: "像在白板上画结构一样拖拽模块，快速定义页面区块、尺寸和位置。",
    icon: ScanLine,
  },
  {
    title: "叠加文本说明",
    description: "直接给每个区域补充功能和文案意图，让 UI 规划不再停留在空框。",
    icon: Blocks,
  },
  {
    title: "导出精准模板",
    description: "实时生成可读性很强的 HTML 建议稿，方便继续开发或评审。",
    icon: Code2,
  },
];

export default function Home() {
  const project = usePlannerStore((state) => state.project);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_18%_12%,rgba(52,240,168,0.18),transparent_30%),radial-gradient(circle_at_82%_8%,rgba(56,189,248,0.14),transparent_32%),radial-gradient(circle_at_60%_92%,rgba(167,139,250,0.16),transparent_36%),linear-gradient(180deg,#0b1024_0%,#05060f_100%)] px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[36px] border border-white/10 bg-white/5 p-6 shadow-[0_32px_120px_rgba(0,0,0,0.32)] backdrop-blur-xl">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-[30px] border border-white/10 bg-slate-950/50 p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-aurora-green/25 bg-aurora-green/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-aurora-green">
                <Sparkles className="h-4 w-4" />
                UI Planning Console
              </div>
              <h1 className="mt-6 max-w-3xl font-title text-5xl leading-[1.05] text-white">
                把你的 UI 草图规划，直接转成能落地的 HTML 模板建议稿。
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
                这个面板已经可以承载第一阶段核心流程：创建画布、框选区域、填写说明、预览代码、导出模板。
                适合产品规划、页面拆解、设计对齐和前端开发前的结构定义。
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/editor"
                  className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-aurora-green via-aurora-teal to-aurora-blue px-5 text-sm font-medium text-slate-950 shadow-[0_14px_40px_rgba(52,240,168,0.35)] transition hover:brightness-105"
                >
                  进入规划编辑器
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <div className="inline-flex h-12 items-center rounded-2xl border border-white/10 bg-white/5 px-5 text-sm text-slate-300">
                  当前示例项目：{project.name}
                </div>
              </div>

              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {highlights.map((item) => {
                  const Icon = item.icon;

                  return (
                    <article
                      key={item.title}
                      className="rounded-[24px] border border-white/10 bg-white/5 p-5"
                    >
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-aurora-green/12 text-aurora-green">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="mt-4 text-sm font-semibold text-white">
                        {item.title}
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-slate-400">
                        {item.description}
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>

            <aside className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,16,31,0.94),rgba(9,16,31,0.72))] p-6">
              <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                Project Snapshot
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                {project.name}
              </h2>

              <div className="mt-6 grid gap-3">
                <SnapshotCard
                  label="画布尺寸"
                  value={`${project.width} x ${project.height}`}
                />
                <SnapshotCard
                  label="模块数量"
                  value={`${project.modules.length} 个`}
                />
                <SnapshotCard label="导出形式" value="单文件 HTML" />
              </div>

              <div className="mt-6 rounded-[28px] border border-aurora-green/15 bg-aurora-green/8 p-5">
                <div className="text-sm font-medium text-aurora-green">
                  这个项目能做，而且已经适合继续扩展
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  当前版本重点保证“结构表达清晰”和“导出代码可读”。后续可继续增加多画板、智能排版、多人协作和设计规范映射。
                </p>
              </div>

              <div className="mt-6 space-y-3 text-sm text-slate-400">
                <p>1. 适合作为产品规划工具、页面拆解工具、需求对齐工具。</p>
                <p>2. 技术路线采用纯前端本地方案，部署轻，迭代快。</p>
                <p>3. 后续可以自然升级为带 AI 建议的 UI 生成器。</p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}

function SnapshotCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
    </div>
  );
}
