import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./index.css";

fetch("/api/token").then(
  (res) => {
    if (res.ok) {
      localStorage.setItem("google", "1");
      sessionStorage.removeItem("google");
    } else if (
      res.status === 401 &&
      localStorage.getItem("google") &&
      !sessionStorage.getItem("google")
    ) {
      sessionStorage.setItem("google", "1");
      location.assign(
        `/.auth/login/google?post_login_redirect_uri=${encodeURIComponent(location.pathname + location.search)}`,
      );
    }
  },
  () => undefined,
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
