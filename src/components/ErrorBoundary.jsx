import { Component } from "react";

/**
 * React Error Boundary — catches render errors and shows a fallback UI.
 * Prevents the entire app from crashing on component errors.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div style={{
            height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
            background: "#f8fafc", fontFamily: "'Outfit', sans-serif", flexDirection: "column", gap: 16, padding: 32,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: "linear-gradient(135deg, #ef4444, #f97316)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 24, fontWeight: 700,
            }}>!</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0 }}>Something went wrong</h2>
            <p style={{ fontSize: 14, color: "#64748b", textAlign: "center", margin: 0 }}>
              An unexpected error occurred. Please refresh the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "12px 24px", borderRadius: 12, border: "none", cursor: "pointer",
                background: "#0f172a", color: "#fff", fontSize: 14, fontWeight: 600,
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              Refresh Page
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
