import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import "./style.css";
import { queryClient } from "./lib/query";

async function boot() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== "false") {
    const { startMocks } = await import("./mocks/browser");
    await startMocks();
  }
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
void boot().catch((error) => {
  console.error(
    "Demo initialization failed:",
    error instanceof Error ? error.message : "unknown",
  );
  document.getElementById("root")!.textContent =
    "Não foi possível iniciar a demonstração. Atualize a página.";
});
