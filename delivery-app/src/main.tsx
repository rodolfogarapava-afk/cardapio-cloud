import { createRoot } from "react-dom/client";
import App from "./App.tsx";

// Fonts (self-hosted via @fontsource)
import "@fontsource-variable/bricolage-grotesque/index.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";

import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
