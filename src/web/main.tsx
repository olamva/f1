import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./index.css";
import { pull } from "./synced.ts";

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

const refresh = () => document.hidden || pull();
refresh();
setInterval(refresh, 15_000);
document.addEventListener("visibilitychange", refresh);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
