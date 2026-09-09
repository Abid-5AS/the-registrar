import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { spawn } from "node:child_process";
const root = resolve("dist");
const prefix = "/registrar-simulator/";
const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    if (!path.startsWith(prefix)) throw new Error("Unknown route");
    const file = resolve(root, path.slice(prefix.length) || "index.html");
    if (!file.startsWith(root + sep) || !(await stat(file)).isFile())
      throw new Error("Unknown file");
    response.writeHead(200, {
      "Content-Type": mime[extname(file)] || "application/octet-stream",
    });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const env = {
  ...process.env,
  GAME_URL: `http://127.0.0.1:${address.port}${prefix}`,
};
try {
  for (const script of ["tests/browser.mjs", "tests/revision.mjs"]) {
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [script], {
        env,
        stdio: "inherit",
      });
      child.once("error", reject);
      child.once("exit", (code) =>
        code === 0 ? resolve() : reject(new Error(`${script} exited ${code}`)),
      );
    });
  }
} finally {
  server.close();
}
