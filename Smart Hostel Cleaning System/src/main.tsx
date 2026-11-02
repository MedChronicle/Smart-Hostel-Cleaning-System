import { Component, StrictMode, Suspense, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

/* ------------------------------------------------------------------ */
/* Theme bootstrap: apply before first paint to avoid a light/dark flash */
/* ------------------------------------------------------------------ */
(function initTheme() {
  try {
    const saved = localStorage.getItem("theme"); // "light" | "dark" | "system"
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = saved === "dark" || ((saved === null || saved === "system") && prefersDark);
    document.documentElement.classList.toggle("dark", dark);
  } catch {
    /* storage blocked: fall back to default theme */
  }
})();

/* ------------------------------------------------------------------ */
/* Error boundary: one bad component should not blank the whole app     */
/* ------------------------------------------------------------------ */
interface BoundaryState { error: Error | null }

class ErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  // Clears persisted state in case corrupt localStorage data caused the crash
  private hardReset = () => {
    try { localStorage.clear(); } catch { /* ignore */ }
    location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="min-h-screen grid place-items-center p-6 bg-background text-foreground">
        <div className="glass max-w-md w-full p-6 space-y-4 animate-scale-in shadow-soft">
          <h1 className="text-xl font-medium">Something went wrong</h1>
          <p className="text-sm text-muted-foreground break-words">{this.state.error.message}</p>
          <div className="flex gap-2">
            <button onClick={this.reset} className="focus-ring px-4 py-2 rounded-md bg-primary text-primary-foreground">
              Try again
            </button>
            <button onClick={this.hardReset} className="focus-ring px-4 py-2 rounded-md bg-secondary text-secondary-foreground">
              Reset saved data
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/* ------------------------------------------------------------------ */
/* Loading fallback                                                     */
/* ------------------------------------------------------------------ */
function Splash() {
  return (
    <div className="min-h-screen p-6 space-y-4 bg-background" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-8 w-64" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton h-24" />)}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Global safety nets for errors React cannot catch                     */
/* ------------------------------------------------------------------ */
window.addEventListener("unhandledrejection", e => console.error("[unhandledrejection]", e.reason));
window.addEventListener("error", e => console.error("[window.error]", e.error ?? e.message));

/* ------------------------------------------------------------------ */
/* Mount                                                                */
/* ------------------------------------------------------------------ */
const container = document.getElementById("root");
if (!container) throw new Error('Root element "#root" not found in index.html');

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<Splash />}>
        <App />
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
);
