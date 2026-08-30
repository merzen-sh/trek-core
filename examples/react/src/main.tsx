import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@trekscripts/ui/globals.css";

import App from "./App.tsx";

createRoot(document.getElementById("trek") as Element).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
