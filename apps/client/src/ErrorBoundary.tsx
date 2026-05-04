import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Показывает сообщение вместо пустого экрана, если рендер упал с ошибкой. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="min-h-dvh bg-[#121212] p-6 font-sans text-neutral-200"
          role="alert"
        >
          <h1 className="text-lg font-semibold text-white">
            Ошибка при отображении
          </h1>
          <p className="mt-2 max-w-xl text-sm text-neutral-400">
            Откройте консоль разработчика (F12 → Console) и пришлите текст
            ошибки. Ниже — краткое описание сбоя.
          </p>
          <pre className="mt-4 max-h-[40vh] overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-red-300/90 whitespace-pre-wrap">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            className="mt-6 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-200"
            onClick={() => window.location.reload()}
          >
            Перезагрузить страницу
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
