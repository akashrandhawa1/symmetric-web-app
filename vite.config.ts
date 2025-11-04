import path from "path";
import type { IncomingMessage, ServerResponse } from "http";
import fs from "fs";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { mockCoachApiPlugin } from "./src/api/gemini/mockServer";
import { handler as coachIntakeHandler } from "./netlify/functions/coach-intake-next";

// Plugin to copy Netlify _redirects file to dist
function netlifyRedirectsPlugin() {
  return {
    name: "netlify-redirects",
    closeBundle() {
      const redirectsContent = "/*    /index.html   200\n";
      fs.writeFileSync("dist/_redirects", redirectsContent);
      console.log("✓ Created _redirects file for Netlify");
    },
  };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function normaliseHeaders(headers: IncomingMessage["headers"]): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value == null) continue;
    output[key] = Array.isArray(value) ? value.join(", ") : String(value);
  }
  return output;
}

function createFunctionMiddleware(handler: Handler) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const body = await readBody(req);
      const fullUrl = new URL(req.url ?? "/", "http://localhost");

      const event: HandlerEvent = {
        path: fullUrl.pathname,
        rawUrl: fullUrl.toString(),
        rawQuery: fullUrl.search.replace(/^\?/, ""),
        httpMethod: (req.method ?? "GET").toUpperCase(),
        headers: normaliseHeaders(req.headers),
        multiValueHeaders: {},
        queryStringParameters: Object.fromEntries(fullUrl.searchParams.entries()),
        multiValueQueryStringParameters: {},
        isBase64Encoded: false,
        body: body.length ? body : null,
      };

      const result = await handler(event, {} as HandlerContext, () => {});

      res.statusCode = result.statusCode ?? 200;
      const headers = result.headers ?? {};
      for (const [key, value] of Object.entries(headers)) {
        if (value != null) {
          res.setHeader(key, value);
        }
      }
      if (!res.hasHeader("Content-Type")) {
        res.setHeader("Content-Type", "application/json");
      }
      res.end(result.body ?? "");
    } catch (error) {
      console.error("[vite][netlify-functions] handler error", error);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
  };
}

function netlifyFunctionProxyPlugin(enabled: boolean) {
  return {
    name: "netlify-function-proxy",
    apply: "serve" as const,
    configureServer(server) {
      if (!enabled) {
        return;
      }
      server.middlewares.use("/.netlify/functions/coach-intake-next", createFunctionMiddleware(coachIntakeHandler));
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const enableFunctionsProxy = env.VITE_DISABLE_FUNCTIONS_PROXY !== "1";

  return {
    server: {
      port: 3000,
      host: "0.0.0.0",
    },
    plugins: [
      netlifyFunctionProxyPlugin(enableFunctionsProxy),
      react(),
      mockCoachApiPlugin({ enabled: env.MOCK_COACH !== "0" }), // Mock API server for coach endpoint (disable with MOCK_COACH=0)
      netlifyRedirectsPlugin(), // Create _redirects for Netlify SPA routing
    ],
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.MOCK_COACH": JSON.stringify(env.MOCK_COACH || "1"),
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
