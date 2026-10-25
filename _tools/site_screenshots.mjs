// Screenshots of the local website through Chrome's DevTools protocol:
// a throwaway profile in the scratchpad, real time between steps so the
// animations play. Usage: node cdpshots.mjs <width>x<height> <name>=<js-or-selector> ...
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "webshots");
mkdirSync(OUT, { recursive: true });
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9333;
const [size = "1440x900", ...jobs] = process.argv.slice(2);
const [W, H] = size.split("x").map(Number);
const mobile = W < 600;
const URL_ = process.env.SITE_URL || "http://127.0.0.1:8765/index.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
  "--no-default-browser-check", `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(HERE, "chrome-profile")}`,
  `--window-size=${W},${H}`, "about:blank"], { stdio: "ignore" });

let ws, nextId = 1;
const pending = new Map();
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});

try {
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === "page");
    } catch { /* not up yet */ }
  }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);
    if (msg.method === "Runtime.exceptionThrown") console.log("PAGE ERROR:", msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") console.log("CONSOLE ERROR:", JSON.stringify(msg.params.args.map(a => a.value || a.description)));
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
    }
  });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.setDownloadBehavior", { behavior: "deny" });
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile });
  if (process.env.REDUCE) await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  if (mobile) await send("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" });
  await send("Page.navigate", { url: URL_ });
  await sleep(2500);
  const errors = await send("Runtime.evaluate", { expression: "window.__errors ? JSON.stringify(window.__errors) : ''", returnByValue: true });
  for (const job of jobs) {
    const [name, action = ""] = job.split(/=(.*)/s);
    let expression;
    if (action.startsWith("js:")) expression = action.slice(3);
    else if (action) expression = `document.documentElement.style.scrollBehavior='auto';(()=>{const el=document.querySelector(${JSON.stringify(action)});const y=el.getBoundingClientRect().top+scrollY-${mobile ? 70 : 90};scrollTo(0,y);})()`;
    else expression = "scrollTo(0,0)";
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) console.log(name, "error:", result.exceptionDetails.text, result.exceptionDetails.exception?.description);
    await sleep(Number(process.env.WAIT || 2600));
    const shot = await send("Page.captureScreenshot", { format: "png" });
    const file = join(OUT, `${name}-${W}.png`);
    writeFileSync(file, Buffer.from(shot.data, "base64"));
    console.log(file);
  }
  const log = await send("Runtime.evaluate", { expression: "JSON.stringify(window.__log||[])", returnByValue: true });
  if (log.result && log.result.value && log.result.value !== "[]") console.log("page log:", log.result.value);
  ws.close();
} finally {
  chrome.kill();
}
