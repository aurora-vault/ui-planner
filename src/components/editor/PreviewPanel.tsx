import { FileCode2, Maximize2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useElementSize } from "@/hooks/useElementSize";
import { CanvasProject, ExportPayload } from "@/types/planner";

type PreviewPanelProps = {
  project: CanvasProject;
  payload: ExportPayload;
};

export function PreviewPanel({ project, payload }: PreviewPanelProps) {
  const previewViewportRef = useRef<HTMLButtonElement | null>(null);
  const previewViewportSize = useElementSize(previewViewportRef);
  const fullscreenViewportRef = useRef<HTMLDivElement | null>(null);
  const fullscreenViewportSize = useElementSize(fullscreenViewportRef);
  // 全屏预览：点击预览区进入，点击全屏遮罩任意处（或按 Esc）退出。
  const [fullscreen, setFullscreen] = useState(false);

  // 全屏时按 Esc 退出——符合常规全屏交互直觉。
  useEffect(() => {
    if (!fullscreen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  // 统计压成一行紧凑小条，把高度全让给预览本身。
  // 模块数量已移交左侧栏（口径统一为总数），这里只留尺寸与体积。
  const stats = useMemo(
    () => [
      { label: "尺寸", value: `${project.width}×${project.height}` },
      {
        label: "体积",
        value: `${Math.round(payload.document.length / 1024)}KB`,
      },
    ],
    [payload.document.length, project.height, project.width],
  );

  const previewScale = useMemo(() => {
    if (!previewViewportSize.width || !previewViewportSize.height) {
      return 1;
    }

    return Math.min(
      (previewViewportSize.width - 16) / project.width,
      (previewViewportSize.height - 16) / project.height,
      1,
    );
  }, [
    previewViewportSize.height,
    previewViewportSize.width,
    project.height,
    project.width,
  ]);

  // 全屏遮罩里的缩放：跟随窗口尺寸自适应（留出四周边距），尽量放大但不超过原始 1:1。
  const fullscreenScale = useMemo(() => {
    if (!fullscreenViewportSize.width || !fullscreenViewportSize.height) {
      return 1;
    }

    return Math.min(
      (fullscreenViewportSize.width - 48) / project.width,
      (fullscreenViewportSize.height - 48) / project.height,
      1,
    );
  }, [
    fullscreenViewportSize.height,
    fullscreenViewportSize.width,
    project.height,
    project.width,
  ]);

  return (
    <section className="flex min-h-0 flex-col rounded-[28px] border border-white/10 bg-white/5">
      {/* 标题 + 统计合并到一行紧凑表头，省下的竖向空间留给预览。 */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <FileCode2 className="h-4 w-4 text-aurora-green" />
          实时预览
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
          {stats.map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/45 px-2 py-0.5"
            >
              <span className="text-slate-500">{item.label}</span>
              <span className="font-medium text-white">{item.value}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 预览区：弹性占满表头以下的全部高度，模块/尺寸/体积不再挤占它。
          点击进入全屏预览——预览区小、看不清细节，点开放大看完整效果。 */}
      <button
        type="button"
        ref={previewViewportRef}
        onClick={() => setFullscreen(true)}
        title="点击全屏预览"
        className="group relative flex min-h-0 flex-1 cursor-zoom-in items-center justify-center overflow-hidden rounded-b-[28px] bg-[#0b1220] p-3"
      >
        <div
          style={{
            width: project.width * previewScale,
            height: project.height * previewScale,
          }}
        >
          <iframe
            title="HTML export preview"
            srcDoc={payload.document}
            sandbox=""
            className="origin-top-left border-0 bg-white"
            style={{
              width: project.width,
              height: project.height,
              transform: `scale(${previewScale})`,
              transformOrigin: "top left",
              pointerEvents: "none",
            }}
          />
        </div>
        {/* 悬停提示：点击放大。预览 iframe 已禁用指针事件，点击会落到这层按钮。 */}
        <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/80 px-2.5 py-1 text-[11px] text-slate-200 opacity-0 transition group-hover:opacity-100">
          <Maximize2 className="h-3.5 w-3.5" />
          全屏预览
        </span>
      </button>

      {/* 全屏预览遮罩：点击任意处（含右上角关闭键）或按 Esc 退出。 */}
      {fullscreen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="全屏预览"
          onClick={() => setFullscreen(false)}
          className="fixed inset-0 z-50 flex cursor-zoom-out flex-col bg-slate-950/95 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <FileCode2 className="h-4 w-4 text-aurora-green" />
              全屏预览
              <span className="text-xs text-slate-400">
                {project.width}×{project.height}
              </span>
            </div>
            <span className="text-xs text-slate-400">点击任意处或按 Esc 返回</span>
          </div>
          <div
            ref={fullscreenViewportRef}
            className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-6"
          >
            <div
              style={{
                width: project.width * fullscreenScale,
                height: project.height * fullscreenScale,
              }}
            >
              <iframe
                title="HTML export fullscreen preview"
                srcDoc={payload.document}
                sandbox=""
                className="origin-top-left border-0 bg-white shadow-[0_30px_120px_rgba(0,0,0,0.6)]"
                style={{
                  width: project.width,
                  height: project.height,
                  transform: `scale(${fullscreenScale})`,
                  transformOrigin: "top left",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
