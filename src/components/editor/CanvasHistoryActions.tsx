import { Redo2, Undo2 } from "lucide-react";
import type { ReactNode } from "react";

// 撤销 / 重做按钮，放在画布底部工具栏尺寸选项左侧。
// 渲染为两枚独立图标胶囊，基础样式与工具栏其余按钮（旋转/复制）完全一致，
// 保证高度对齐。canUndo/canRedo 为 false 时置灰禁用——给反馈也避免空栈误触。
type CanvasHistoryActionsProps = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

export function CanvasHistoryActions({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: CanvasHistoryActionsProps) {
  return (
    <>
      <HistoryButton
        onClick={onUndo}
        disabled={!canUndo}
        label="撤销（Ctrl+Z）"
      >
        <Undo2 className="h-4 w-4" />
      </HistoryButton>
      <HistoryButton
        onClick={onRedo}
        disabled={!canRedo}
        label="重做（Ctrl+Shift+Z）"
      >
        <Redo2 className="h-4 w-4" />
      </HistoryButton>
    </>
  );
}

type HistoryButtonProps = {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: ReactNode;
};

function HistoryButton({
  onClick,
  disabled,
  label,
  children,
}: HistoryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 transition enabled:hover:border-aurora-green/40 enabled:hover:bg-aurora-green/10 disabled:cursor-not-allowed disabled:text-slate-600"
    >
      {children}
    </button>
  );
}
