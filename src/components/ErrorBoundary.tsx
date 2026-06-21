import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

// 兜底防护：React 在 render 期间抛出的任何异常，若无人接住，整棵树会被卸载，
// 页面只剩深色 body —— 也就是「黑屏」。这个边界把异常拦下来，显示可读的提示，
// 并提供「重置规划」入口让用户自救，而不是面对一片空白无从下手。
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 保留控制台记录，方便开发时定位；生产环境可在此接入上报。
    console.error("应用渲染异常被 ErrorBoundary 捕获：", error, info);
  }

  private handleReset = () => {
    // 清掉持久化状态后整页刷新，回到干净的默认项目，规避「坏数据反复触发崩溃」。
    try {
      window.localStorage.removeItem("ui-planner-store");
    } catch {
      // localStorage 不可用时忽略，刷新本身仍可能恢复。
    }
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#0b1024_0%,#05060f_60%)] px-6 text-white">
        <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/5 p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <h1 className="text-lg font-semibold text-white">页面出了点问题</h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            规划面板在渲染时遇到了异常。你可以先重置规划数据再试一次，
            如果问题反复出现，把下方错误信息发出来便于排查。
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-left text-xs leading-6 text-rose-200">
            {error.message}
          </pre>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-aurora-green via-aurora-teal to-aurora-blue px-5 text-sm font-medium text-slate-950 transition hover:brightness-105"
            >
              重置规划并刷新
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm text-slate-200 transition hover:border-aurora-green/40 hover:bg-aurora-green/10"
            >
              仅刷新页面
            </button>
          </div>
        </div>
      </main>
    );
  }
}
