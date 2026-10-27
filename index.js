import express from "express";
import { createApp } from "./dist/app.js";

// Vercel entry point: serve the compiled API (dist/, built by `npm run build`).
// Vercel auto-detects this root file before src/app.ts, so it runs the already
// compiled JavaScript instead of re-compiling the TypeScript sources.
const app = express();
app.use(createApp());

export default app;
