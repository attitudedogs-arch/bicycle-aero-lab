import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/aero-asset-runtime";

if (typeof window !== "undefined") {
  window.__BICYCLE_AERO_ASSETS__ = {
    bicycleUrl: import.meta.env.VITE_AERO_BICYCLE_URL || "/assets/bicycle.glb",
    riderUrl: import.meta.env.VITE_AERO_RIDER_URL || "https://three.ws/api/glb?src=https%3A%2F%2Fpub-2534e921bf9c4314addcd4d8a6e98b7b.r2.dev%2Favatars%2Fmixamo%2Fglb%2Fy-bot.glb",
  };
}

createRoot(document.getElementById("root")!).render(<App />);
