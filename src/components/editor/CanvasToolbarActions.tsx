import { Eraser, FolderInput } from "lucide-react";
import { useRef } from "react";

// 悬浮工具栏里的「重置示例」「导入配置」两个动作。按 nav 规划从顶部导航栏移到画布
// 底部悬浮工具栏——它们是低频操作，不必常驻导航栏。导入用隐藏 file input 触发。
type CanvasToolbarActionsProps = {
  onReset: () => void;
  onImportConfig: (file: File) => void;
};

export function CanvasToolbarActions({
  onReset,
  onImportConfig,
}: CanvasToolbarActionsProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportConfig(file);
    }
    // 清空 value：否则连续导入同名文件不会再触发 change 事件。
    event.target.value = "";
  };

  return (
    <>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 transition hover:border-amber-300/40 hover:bg-amber-300/10"
      >
        <Eraser className="h-4 w-4" />
        重置示例
      </button>
      <button
        type="button"
        onClick={() => importInputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 transition hover:border-aurora-green/40 hover:bg-aurora-green/10"
      >
        <FolderInput className="h-4 w-4" />
        导入配置
      </button>
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleImportPick}
        className="hidden"
      />
    </>
  );
}
