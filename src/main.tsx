import React from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConfigurationNotice, ErrorBoundary, FutureOSApp, PreviewApp } from "./App";
import "./styles.css";

const root = createRoot(document.getElementById("root")!);
const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const localPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).has("preview");

if (localPreview) {
  root.render(<React.StrictMode><PreviewApp /></React.StrictMode>);
} else if (!convexUrl) {
  root.render(<React.StrictMode><ConfigurationNotice /></React.StrictMode>);
} else {
  const convex = new ConvexReactClient(convexUrl);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <ConvexProvider client={convex}>
          <FutureOSApp />
        </ConvexProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
