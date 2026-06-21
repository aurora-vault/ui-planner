import { RotateCw } from "lucide-react";

// 旋转按钮：把选中模块宽高对调（中心不变）。未选中模块时禁用置灰。
// 放在画布底部工具栏尺寸选项右侧。
type CanvasRotateActionProps = {
  disabled: boolean;
  onRotate: () => void;
};

export function CanvasRotateAction({
  disabled,
  onRotate,
}: CanvasRotateActionProps) {
  return (
    <button
      type="button"
      onClick={onRotate}
      disabled={disabled}
      title="旋转 90°（宽高对调，快捷键 R）"
      aria-label="旋转选中模块 90 度"
      className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 transition enabled:hover:border-aurora-green/40 enabled:hover:bg-aurora-green/10 disabled:cursor-not-allowed disabled:text-slate-600"
    >
      <RotateCw className="h-4 w-4" />
    </button>
  );
}
