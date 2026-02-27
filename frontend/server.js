import express from "express";
import {createProxyMiddleware} from "http-proxy-middleware";
import path from "path";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

// Proxy API requests to backend
app.use(
  "/api",
  createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    ws: true, // Proxy WebSocket connections
    onProxyReq: (proxyReq, req, res) => {
      // Forward cookies and headers
      console.log(
        `[PROXY] ${req.method} ${req.url} -> ${BACKEND_URL}${req.url}`,
      );
    },
    onError: (err, req, res) => {
      console.error("[PROXY ERROR]", err);
      res.status(500).json({error: "Proxy error"});
    },
  }),
);

// Proxy WebSocket requests
app.use(
  "/ws",
  createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    ws: true,
    onError: (err, req, res) => {
      console.error("[WS PROXY ERROR]", err);
    },
  }),
);

// Serve static files
app.use(express.static(path.join(__dirname, "dist")));

// SPA fallback - serve index.html for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Frontend server running on port ${PORT}`);
  console.log(`📡 Proxying /api to ${BACKEND_URL}`);
});
