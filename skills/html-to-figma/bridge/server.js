// Local relay between the agent and the HTML → Figma Bridge plugin. Loopback only, port 3999.
//   bun server.js --assets <project>/figma-bridge/assets
// Plugin side:  GET /ping · GET /next (long-poll) · POST /result · GET /asset?f=<name>[.ext]
// Agent side:   POST /run?timeout=<ms>  body = script text  → JSON {ok, result|error}
//               GET  /status
import { join, resolve } from "node:path";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const ASSETS = resolve(arg("--assets", join(process.cwd(), "figma-bridge", "assets")));
const PORT = 3999; // fixed: the plugin manifest only allows http://localhost:3999

const queue = [];
const waiters = new Map();
let pollers = [];
let seq = 0;
let lastPoll = 0;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Private-Network": "true",
};

function dispatch(job) {
  const p = pollers.shift();
  if (p) p.res(job);
  else queue.push(job);
}

// Asset lookup: exact file name, else the same base name with an image extension (layouts pass base names).
async function asset(name) {
  for (const candidate of [name, name + ".jpg", name + ".png", name + ".jpeg", name + ".gif"]) {
    const f = Bun.file(join(ASSETS, candidate));
    if (await f.exists()) return f;
  }
  return null;
}

const handler = {
  port: PORT,
  idleTimeout: 255,
  async fetch(req) {
    const u = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (u.pathname === "/ping") return new Response("ok", { headers: cors });
    if (u.pathname === "/status") {
      return Response.json({ assets: ASSETS, pollers: pollers.length, queued: queue.length, lastPollMsAgo: lastPoll ? Date.now() - lastPoll : null });
    }
    if (u.pathname === "/next") {
      lastPoll = Date.now();
      if (queue.length) return Response.json(queue.shift(), { headers: cors });
      const job = await new Promise((res) => {
        const p = { res };
        pollers.push(p);
        setTimeout(() => {
          pollers = pollers.filter((x) => x !== p);
          res(null);
        }, 20000);
      });
      return job ? Response.json(job, { headers: cors }) : new Response(null, { status: 204, headers: cors });
    }
    if (u.pathname === "/result" && req.method === "POST") {
      const msg = JSON.parse(await req.text());
      const w = waiters.get(msg.id);
      if (w) {
        waiters.delete(msg.id);
        w(msg);
      }
      return new Response("ok", { headers: cors });
    }
    if (u.pathname === "/asset") {
      const name = (u.searchParams.get("f") || "").replace(/[^\w.-]/g, "");
      const f = name && (await asset(name));
      return f ? new Response(f, { headers: cors }) : new Response("not found: " + name, { status: 404, headers: cors });
    }
    if (u.pathname === "/run" && req.method === "POST") {
      const code = await req.text();
      const timeout = Number(u.searchParams.get("timeout") || 180000);
      // Fail fast when no plugin is connected (nobody polling for 30 s and nothing running) instead of waiting for
      // the full timeout; a busy plugin (a script in flight) still gets the job queued.
      const idle = !pollers.length && !waiters.size && (!lastPoll || Date.now() - lastPoll > 30000);
      if (idle) return Response.json({ ok: false, error: "plugin not connected: open the Figma file and run Plugins → Development → HTML → Figma Bridge (local) until it shows Connected" });
      const id = ++seq;
      const msg = await new Promise((done) => {
        const t = setTimeout(() => {
          waiters.delete(id);
          // Drop the job if the plugin never picked it up, so a later plugin session does not run stale code.
          const i = queue.findIndex((j) => j.id === id);
          if (i >= 0) queue.splice(i, 1);
          done({ ok: false, error: "timeout: plugin did not answer (is the HTML → Figma Bridge plugin open and Connected?)" });
        }, timeout);
        waiters.set(id, (m) => {
          clearTimeout(t);
          done(m);
        });
        dispatch({ id, code });
      });
      return Response.json(msg);
    }
    return new Response("not found", { status: 404, headers: cors });
  },
};

// `localhost` may resolve to either loopback family inside Figma; listen on both, never on LAN.
Bun.serve({ ...handler, hostname: "127.0.0.1" });
try {
  Bun.serve({ ...handler, hostname: "::1" });
} catch (e) {
  console.log("IPv6 loopback unavailable: " + e.message);
}
console.log("bridge listening on localhost:" + PORT + " · assets " + ASSETS);
