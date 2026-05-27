import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import AppRoutes from "./Routes";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);
