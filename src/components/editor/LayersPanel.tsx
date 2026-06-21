import type { DragEvent, ReactNode } from "react";
import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
   Lock,
  LockOpen,
  Trash2,
} from "lucide-react";

import { UIModule } from "@/types/planner";
import { ModuleNode } from "@/utils/moduleTree";
import { cn } from "@/lib/utils";

// 拖拽落点：放到目标「上半区=之前」「下半区=之后」「中间=成为其子」。
type DropPosition = "before" | "after" | "inside";

type DropHint = {
  targetId: string;
  position: DropPosition;
};

type LayersPanelProps = {
  // 已按树序展开的节点列表（父在前、子缩进紧随，collapsed 的父其子树已被跳过）。
  nodes: ModuleNode[];
  // 模块总数（含折叠子树里的）——头部展示用，与右下预览口径一致。
  totalCount: number;
  selectedModuleId: string | null;
  onSelect: (moduleId: string) => void;
  onToggleVisible: (module: UIModule) => void;
  onToggleLocked: (module: UIModule) => void;
  onToggleCollapsed: (moduleId: string) => void;
  onDuplicate: (moduleId: string) => void;
  onDelete: (moduleId: string) => void;
  // 拖拽重排：把 draggedId 放到 targetId 的前/后（同层）或内部（成为其子）。
  onReorder: (
    draggedId: string,
    targetId: string,
    position: DropPosition,
  ) => void;
};

export function LayersPanel({
  nodes,
  totalCount,
  selectedModuleId,
  onSelect,
  onToggleVisible,
  onToggleLocked,
  onToggleCollapsed,
  onDuplicate,
  onDelete,
  onReorder,
}: LayersPanelProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);

  // 在目标行内按指针纵向位置判断落点：上 1/4=前、下 1/4=后、中间=嵌套为子。
  const computePosition = (
    event: DragEvent<HTMLLIElement>,
  ): DropPosition => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offset = event.clientY - rect.top;
    if (offset < rect.height * 0.25) {
      return "before";
    }
    if (offset > rect.height * 0.75) {
      return "after";
    }
    return "inside";
  };

  const handleDragOver = (node: ModuleNode) => (event: DragEvent<HTMLLIElement>) => {
    if (!draggingId || draggingId === node.id) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const position = computePosition(event);
    setDropHint((current) =>
      current?.targetId === node.id && current.position === position
        ? current
        : { targetId: node.id, position },
    );
  };

  const handleDrop = (node: ModuleNode) => (event: DragEvent<HTMLLIElement>) => {
    event.preventDefault();
    if (draggingId && draggingId !== node.id) {
      onReorder(draggingId, node.id, computePosition(event));
    }
    setDraggingId(null);
    setDropHint(null);
  };

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-[28px] border border-white/10 bg-white/5">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h2 className="text-sm font-semibold text-white">布局图层</h2>
        {/* 新增模块按钮已移除：统一走画布底部悬浮工具栏的「新增模块」，避免重复入口。
            计数用 totalCount（模块总数），不用 nodes.length——后者会漏掉折叠父模块下的子树。 */}
        <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
          {totalCount} 个
        </div>
      </div>

      {/* 嵌套树：每个节点按 depth 缩进，父模块带折叠箭头。
          行可拖拽重排：拖到目标上/下边缘=同层前/后，拖到中间=成为其子模块。
          列表用 scroll-thin 细滚动条（见 index.css）。 */}
      <ul className="thin-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {nodes.map((node) => {
          const isSelected = selectedModuleId === node.id;
          const hasChildren = node.children.length > 0;
          // 每层缩进 18px，用外边距实现。
          const indent = node.depth * 18;
          const isDragging = draggingId === node.id;
          const hint = dropHint?.targetId === node.id ? dropHint.position : null;

          return (
            <li
              key={node.id}
              draggable
              onDragStart={(event) => {
                setDraggingId(node.id);
                event.dataTransfer.effectAllowed = "move";
                // Firefox 必须 setData 才会触发拖拽。
                event.dataTransfer.setData("text/plain", node.id);
              }}
              onDragOver={handleDragOver(node)}
              onDragLeave={() =>
                setDropHint((current) =>
                  current?.targetId === node.id ? null : current,
                )
              }
              onDrop={handleDrop(node)}
              onDragEnd={() => {
                setDraggingId(null);
                setDropHint(null);
              }}
              className={cn(
                "relative transition",
                isDragging && "opacity-40",
                // 落点提示：前/后画一条边线（画在 li 上，覆盖整行宽度）。
                hint === "before" &&
                  "before:absolute before:-top-1 before:left-2 before:right-2 before:z-10 before:h-0.5 before:rounded-full before:bg-aurora-green",
                hint === "after" &&
                  "after:absolute after:-bottom-1 after:left-2 after:right-2 after:z-10 after:h-0.5 after:rounded-full after:bg-aurora-green",
              )}
              style={{
                marginLeft: indent,
                // 有子模块时右下留出叠卡探出的空间，避免牌角被相邻行/相邻列裁掉。
                marginRight: hasChildren
                  ? Math.min(node.children.length, 3) * 4
                  : undefined,
                marginBottom: hasChildren
                  ? Math.min(node.children.length, 3) * 4
                  : undefined,
              }}
            >
              {/* 扑克牌式层叠提示：有子模块时，在真实卡片「背后」叠几张向右下偏移的卡，
                  子模块越多叠得越多（上限 3 张，只做大概预览）。内容卡是不透明的，会盖住
                  叠卡的左/上/内部，只让右下牌角探出——形成扑克牌堆叠观感。DOM 在前即绘制
                  在下，无需 z-index。 */}
              {hasChildren
                ? Array.from({
                    length: Math.min(node.children.length, 3),
                  }).map((_, index) => {
                    const offset = (index + 1) * 4;
                    return (
                      <span
                        key={`stack-${index}`}
                        aria-hidden
                        className="pointer-events-none absolute inset-0 rounded-2xl border border-white/12 bg-slate-800"
                        style={{
                          transform: `translate(${offset}px, ${offset}px)`,
                          opacity: 0.7 - index * 0.18,
                        }}
                      />
                    );
                  })
                : null}

              {/* 真实内容卡：边框/背景/选中高亮都在这层。它不透明，盖住叠卡的左上部，
                  只让右下牌角探出，形成扑克牌堆叠观感。 */}
              <div
                className={cn(
                  // 底色必须不透明：否则会透出背后叠卡的左/上边，卡内出现多余线条。
                  // 选中/inside 用边框+ring 高亮，不改背景，从而始终遮住叠卡只露右下牌角。
                  "relative rounded-2xl border bg-slate-900 transition",
                  isSelected
                    ? "border-aurora-green/50 ring-1 ring-aurora-green/30 shadow-[0_12px_30px_rgba(52,240,168,0.18)]"
                    : "border-white/8 hover:border-white/15",
                  hint === "inside" && "border-aurora-green/70 ring-1 ring-aurora-green/40",
                )}
              >
              <div className="flex items-stretch">
                {/* 拖拽手柄：明确告诉用户这行可拖动重排 */}
                <span
                  className="flex w-6 shrink-0 cursor-grab items-center justify-center text-slate-600 active:cursor-grabbing"
                  aria-hidden
                >
                  <GripVertical className="h-4 w-4" />
                </span>

                {/* 折叠箭头：仅父模块显示；叶子留出等宽占位以保持对齐 */}
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => onToggleCollapsed(node.id)}
                    aria-label={node.collapsed ? "展开子模块" : "收起子模块"}
                    className="flex w-7 shrink-0 items-center justify-center text-slate-400 transition hover:text-aurora-green"
                  >
                    {node.collapsed ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                ) : (
                  <span className="w-7 shrink-0" aria-hidden />
                )}

                <button
                  type="button"
                  onClick={() => onSelect(node.id)}
                  aria-pressed={isSelected}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-tr-2xl py-3 pr-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-aurora-green/60"
                >
                  <span
                    className="inline-flex h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: node.accent }}
                  />
                  {/* 只显示标题，单行溢出省略——描述移交右侧属性栏编辑 */}
                  <span className="truncate text-sm font-medium text-slate-100">
                    {node.name}
                  </span>
                  {hasChildren ? (
                    <span className="shrink-0 rounded-full border border-white/10 px-1.5 text-[10px] text-slate-400">
                      {node.children.length}
                    </span>
                  ) : null}
                </button>
              </div>

              {node.path.length > 0 ? (
                <p className="flex items-center gap-1 truncate px-3 pb-1 pl-[52px] text-[10px] leading-4 text-slate-500">
                  {node.path.map((ancestor, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1"
                    >
                      {index > 0 ? (
                        <ChevronRight className="h-2.5 w-2.5 shrink-0" />
                      ) : null}
                      <span className="truncate">{ancestor}</span>
                    </span>
                  ))}
                </p>
              ) : null}

              <div className="flex items-center gap-1.5 px-3 pb-3 pl-[52px] text-slate-300">
                <ActionChip
                  onClick={() => onToggleVisible(node)}
                  label={node.visible ? "隐藏" : "显示"}
                >
                  {node.visible ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                </ActionChip>
                <ActionChip
                  onClick={() => onToggleLocked(node)}
                  label={node.locked ? "解锁" : "锁定"}
                >
                  {node.locked ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <LockOpen className="h-3.5 w-3.5" />
                  )}
                </ActionChip>
                <ActionChip onClick={() => onDuplicate(node.id)} label="复制">
                  <Copy className="h-3.5 w-3.5" />
                </ActionChip>
                <ActionChip onClick={() => onDelete(node.id)} label="删除">
                  <Trash2 className="h-3.5 w-3.5" />
                </ActionChip>
              </div>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

type ActionChipProps = {
  label: string;
  onClick: () => void;
  children: ReactNode;
};

function ActionChip({ label, onClick, children }: ActionChipProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-aurora-green/40 hover:bg-aurora-green/10 hover:text-aurora-green"
    >
      {children}
    </button>
  );
}
