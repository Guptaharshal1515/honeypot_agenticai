import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html for all non-API routes (SPA fallback)
  app.use((req, res, next) => {
    // Don't catch API routes or health check
    if (req.path.startsWith("/api") || req.path === "/health") {
      return next();
    }
    // Serve index.html for all other routes (SPA)
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
