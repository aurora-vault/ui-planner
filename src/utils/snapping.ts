// 画布吸附：拖动/缩放模块时把边缘对齐到其他模块与画布边界，输出对齐参考线。
// 纯函数、不依赖 Konva，方便单测；坐标全部为画布坐标系（未经 stage 缩放）。

export type Bounds = { x: number; y: number; width: number; height: number };

// 对齐参考线：axis="x" 为竖线（position 是 x，start/end 是 y 跨度），
// axis="y" 为横线（position 是 y，start/end 是 x 跨度）。
export type Guide = {
  axis: "x" | "y";
  position: number;
  start: number;
  end: number;
};

export type SnapOutcome = { x: number; y: number; guides: Guide[] };

// 一个盒子在某轴上的三条吸附线：起始边、中线、结束边。
const edgesX = (b: Bounds) => [b.x, b.x + b.width / 2, b.x + b.width];
const edgesY = (b: Bounds) => [b.y, b.y + b.height / 2, b.y + b.height];

// 在候选目标里找离 value 最近、且在阈值内的那个；没有则返回 null。
const nearest = (value: number, targets: number[], threshold: number) => {
  let best: number | null = null;
  let bestDist = threshold + 1;
  for (const target of targets) {
    const dist = Math.abs(target - value);
    if (dist < bestDist) {
      bestDist = dist;
      best = target;
    }
  }
  return bestDist <= threshold ? best : null;
};

// 拖动吸附：只平移（不改尺寸）。分别为 X / Y 轴挑一个最优整体偏移，
// 让模块的左/中/右、上/中/下任一边贴到最近的目标线，再生成所有命中的参考线。
export function computeSnap(
  moving: Bounds,
  others: Bounds[],
  canvas: { width: number; height: number },
  threshold: number,
): SnapOutcome {
  const targetsX = [
    0,
    canvas.width / 2,
    canvas.width,
    ...others.flatMap(edgesX),
  ];
  const targetsY = [
    0,
    canvas.height / 2,
    canvas.height,
    ...others.flatMap(edgesY),
  ];

  // 为 X 轴找「移动边 → 目标线」中绝对距离最小的一对，得出整体偏移量。
  let bestDX = 0;
  let bestDistX = threshold + 1;
  for (const edge of edgesX(moving)) {
    for (const target of targetsX) {
      const dist = Math.abs(target - edge);
      if (dist < bestDistX) {
        bestDistX = dist;
        bestDX = target - edge;
      }
    }
  }
  const snappedX = bestDistX <= threshold ? moving.x + bestDX : moving.x;

  let bestDY = 0;
  let bestDistY = threshold + 1;
  for (const edge of edgesY(moving)) {
    for (const target of targetsY) {
      const dist = Math.abs(target - edge);
      if (dist < bestDistY) {
        bestDistY = dist;
        bestDY = target - edge;
      }
    }
  }
  const snappedY = bestDistY <= threshold ? moving.y + bestDY : moving.y;

  const snapped: Bounds = { ...moving, x: snappedX, y: snappedY };
  return {
    x: snappedX,
    y: snappedY,
    guides: boundsGuides(snapped, others, canvas),
  };
}

// 在某个落定盒子上收集所有「正好对齐」的参考线（供拖动/缩放时高亮显示）。
export const boundsGuides = (
  box: Bounds,
  others: Bounds[],
  canvas: { width: number; height: number },
): Guide[] => {
  const guides: Guide[] = [];
  const eps = 0.5;

  // 竖线候选：画布左/中/右（跨满画布高），以及每个模块的三条 X 线（跨该模块高）。
  const vCandidates = [
    { pos: 0, lo: 0, hi: canvas.height },
    { pos: canvas.width / 2, lo: 0, hi: canvas.height },
    { pos: canvas.width, lo: 0, hi: canvas.height },
    ...others.flatMap((o) =>
      edgesX(o).map((pos) => ({ pos, lo: o.y, hi: o.y + o.height })),
    ),
  ];
  const movingX = edgesX(box);
  for (const candidate of vCandidates) {
    if (movingX.some((edge) => Math.abs(edge - candidate.pos) <= eps)) {
      guides.push({
        axis: "x",
        position: candidate.pos,
        start: Math.min(candidate.lo, box.y),
        end: Math.max(candidate.hi, box.y + box.height),
      });
    }
  }

  const hCandidates = [
    { pos: 0, lo: 0, hi: canvas.width },
    { pos: canvas.height / 2, lo: 0, hi: canvas.width },
    { pos: canvas.height, lo: 0, hi: canvas.width },
    ...others.flatMap((o) =>
      edgesY(o).map((pos) => ({ pos, lo: o.x, hi: o.x + o.width })),
    ),
  ];
  const movingY = edgesY(box);
  for (const candidate of hCandidates) {
    if (movingY.some((edge) => Math.abs(edge - candidate.pos) <= eps)) {
      guides.push({
        axis: "y",
        position: candidate.pos,
        start: Math.min(candidate.lo, box.x),
        end: Math.max(candidate.hi, box.x + box.width),
      });
    }
  }

  // 同位置去重（画布中线与某模块边线重合时只画一条）。
  const seen = new Set<string>();
  return guides.filter((guide) => {
    const key = `${guide.axis}:${Math.round(guide.position)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export type MovedEdges = {
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
};

// 缩放吸附：只吸附「实际被拖动的那几条边」，对侧边保持不动（改尺寸而非整体平移）。
// 吸附后保证不小于 minSize。
export function snapResizeBounds(
  bounds: Bounds,
  moved: MovedEdges,
  others: Bounds[],
  canvas: { width: number; height: number },
  threshold: number,
  minSize: number,
): Bounds {
  let { x, y, width, height } = bounds;
  const targetsX = [
    0,
    canvas.width / 2,
    canvas.width,
    ...others.flatMap(edgesX),
  ];
  const targetsY = [
    0,
    canvas.height / 2,
    canvas.height,
    ...others.flatMap(edgesY),
  ];

  if (moved.left) {
    const right = x + width;
    const snap = nearest(x, targetsX, threshold);
    if (snap !== null && right - snap >= minSize) {
      x = snap;
      width = right - x;
    }
  }
  if (moved.right) {
    const snap = nearest(x + width, targetsX, threshold);
    if (snap !== null && snap - x >= minSize) {
      width = snap - x;
    }
  }
  if (moved.top) {
    const bottom = y + height;
    const snap = nearest(y, targetsY, threshold);
    if (snap !== null && bottom - snap >= minSize) {
      y = snap;
      height = bottom - y;
    }
  }
  if (moved.bottom) {
    const snap = nearest(y + height, targetsY, threshold);
    if (snap !== null && snap - y >= minSize) {
      height = snap - y;
    }
  }

  return {
    x,
    y,
    width: Math.max(minSize, width),
    height: Math.max(minSize, height),
  };
}
