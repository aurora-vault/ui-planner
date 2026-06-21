// 画布尺寸预设下拉。常见桌面 / 平板 / 手机 / 比例一键套用，省去手填宽高。
// 值受 Editor 的 clampCanvasValue 约束在 640–2400，这里只放落在范围内的常用尺寸。
// 当前尺寸不在预设里时，下拉首项显示「自定义 W×H」并选中它，避免下拉空白。
const CANVAS_PRESETS = [
  { label: "桌面 720p", width: 1280, height: 720 },
  { label: "桌面 1080p", width: 1440, height: 960 },
  { label: "桌面宽屏", width: 1600, height: 900 },
  { label: "笔记本", width: 1366, height: 768 },
  { label: "平板横向", width: 1024, height: 768 },
  { label: "平板竖向", width: 768, height: 1024 },
  { label: "手机竖向", width: 720, height: 1280 },
  { label: "正方形", width: 1080, height: 1080 },
];

type CanvasSizeSelectProps = {
  width: number;
  height: number;
  onWidthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
};

export function CanvasSizeSelect({
  width,
  height,
  onWidthChange,
  onHeightChange,
}: CanvasSizeSelectProps) {
  const isPreset = CANVAS_PRESETS.some(
    (preset) => preset.width === width && preset.height === height,
  );

  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
      尺寸
      <select
        value={`${width}x${height}`}
        onChange={(event) => {
          const [w, h] = event.target.value.split("x").map(Number);
          if (Number.isFinite(w) && Number.isFinite(h)) {
            onWidthChange(w);
            onHeightChange(h);
          }
        }}
        className="bg-transparent text-white outline-none [&>option]:bg-slate-900"
      >
        {!isPreset ? (
          <option value={`${width}x${height}`}>
            自定义 {width}×{height}
          </option>
        ) : null}
        {CANVAS_PRESETS.map((preset) => (
          <option key={preset.label} value={`${preset.width}x${preset.height}`}>
            {preset.label}（{preset.width}×{preset.height}）
          </option>
        ))}
      </select>
    </label>
  );
}
