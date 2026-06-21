import { describe, expect, it } from "vitest";

import { computeSnap, snapResizeBounds } from "./snapping";

const canvas = { width: 1000, height: 1000 };

describe("computeSnap（拖动吸附）", () => {
  it("左边缘接近画布左界时吸附到 0", () => {
    const result = computeSnap(
      { x: 6, y: 200, width: 100, height: 80 },
      [],
      canvas,
      8,
    );
    expect(result.x).toBe(0);
    expect(result.y).toBe(200); // 阈值外不动
    expect(result.guides.some((g) => g.axis === "x" && g.position === 0)).toBe(
      true,
    );
  });

  it("中线接近画布中线时吸附居中", () => {
    // 盒宽 100，画布中线 500 → 居中时 x=450。起始 x=446，中线=496，距 500 为 4。
    const result = computeSnap(
      { x: 446, y: 0, width: 100, height: 100 },
      [],
      canvas,
      8,
    );
    expect(result.x).toBe(450);
  });

  it("边缘对齐到另一模块的边缘", () => {
    const other = { x: 300, y: 0, width: 200, height: 100 };
    // 移动盒左边 x=503，距 other 右边 500 为 3，应吸附到 500。
    const result = computeSnap(
      { x: 503, y: 400, width: 100, height: 100 },
      [other],
      canvas,
      8,
    );
    expect(result.x).toBe(500);
  });

  it("阈值之外完全不动且无参考线", () => {
    // 取一个三条边（起/中/止）都远离画布 0/中线/末端的位置：
    // x 边 123/173/223，y 边 300/350/400，均距任何目标线 >8。
    const result = computeSnap(
      { x: 123, y: 300, width: 100, height: 100 },
      [],
      canvas,
      8,
    );
    expect(result.x).toBe(123);
    expect(result.y).toBe(300);
    expect(result.guides).toHaveLength(0);
  });
});

describe("snapResizeBounds（缩放吸附）", () => {
  it("只吸附被拖动的右边，左边不动", () => {
    const result = snapResizeBounds(
      { x: 100, y: 100, width: 398, height: 200 },
      { left: false, right: true, top: false, bottom: false },
      [],
      canvas,
      8,
      12,
    );
    // 右边 x+w=498，距画布中线 500 为 2 → 吸附，width=400；左边仍在 100。
    expect(result.x).toBe(100);
    expect(result.width).toBe(400);
  });

  it("吸附不会把尺寸压到小于 minSize", () => {
    const result = snapResizeBounds(
      { x: 100, y: 100, width: 16, height: 200 },
      { left: true, right: false, top: false, bottom: false },
      [{ x: 110, y: 0, width: 50, height: 50 }],
      canvas,
      8,
      12,
    );
    // 左边若吸到 110 则宽只剩 6 < 12，应拒绝吸附保持原状。
    expect(result.x).toBe(100);
    expect(result.width).toBe(16);
  });
});
