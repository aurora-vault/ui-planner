import { CopyPlus } from "lucide-react";

// 复制按钮：把选中模块原地复制一份（偏移 24px、保持同父分组）。未选中时禁用置灰。
// 放在画布底部工具栏旋转按钮右侧。仅图标，与旋转/撤销保持一致的胶囊样式。
type CanvasDuplicateActionProps = {
  disabled: boolean;
  onDuplicate: () => void;
};

export function CanvasDuplicateAction({
  disabled,
  onDuplicate,
}: CanvasDuplicateActionProps) {
  return (
    <button
      type="button"
      onClick={onDuplicate}
      disabled={disabled}
      title="复制选中模块（Ctrl+D）"
      aria-label="复制选中模块"
      className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 transition enabled:hover:border-aurora-green/40 enabled:hover:bg-aurora-green/10 disabled:cursor-not-allowed disabled:text-slate-600"
    >
      <CopyPlus className="h-4 w-4" />
    </button>
  );
}
