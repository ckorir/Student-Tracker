import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Override fetch to include auth token
const originalFetch = window.fetch;
window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
  const token = localStorage.getItem("attendance_token");
  
  if (token && typeof input === "string" && input.startsWith("/api")) {
    init = init || {};
    init.headers = {
      ...init.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  
  return originalFetch(input, init);
};

createRoot(document.getElementById("root")!).render(<App />);
