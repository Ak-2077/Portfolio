import { writeFileSync } from "node:fs";

const HOST = "http://127.0.0.1:9223";
async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const j = await (await fetch(`${HOST}/json/version`)).json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch { /* not up */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("no chrome debug endpoint");
}

const ws = new WebSocket(await getWsUrl());
await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });

let id = 0;
const pending = new Map();
const events = [];
let sessionId = null;
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  } else if (m.method) events.push(m);
});
function send(method, params = {}, useSession = true) {
  const mid = ++id;
  const p = { id: mid, method, params };
  if (useSession && sessionId) p.sessionId = sessionId;
  ws.send(JSON.stringify(p));
  return new Promise((resolve, reject) => pending.set(mid, { resolve, reject }));
}

const { targetId } = await send("Target.createTarget", { url: "about:blank" }, false);
({ sessionId } = await send("Target.attachToTarget", { targetId, flatten: true }, false));
await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable");
await send("Network.enable"); await send("Network.setCacheDisabled", { cacheDisabled: true });

async function evaluate(expression) {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
const setViewport = (width, height) =>
  send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });

await setViewport(1400, 1200);
await send("Page.navigate", { url: "http://localhost:8099/index.html" });
await new Promise((r) => setTimeout(r, 4000));

const errs = events.filter(e =>
  (e.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(e.params.type)) ||
  e.method === "Runtime.exceptionThrown" ||
  (e.method === "Log.entryAdded" && e.params.entry.level === "error"));
console.log("console errors:", errs.length ? errs.map(e => e.params?.entry?.text || e.params?.exceptionDetails?.text).join(" | ") : "none");
const bad = events.filter(e => e.method === "Network.responseReceived" && e.params.response.status >= 400 && e.params.response.url.startsWith("http://localhost"));
console.log("local 4xx/5xx:", bad.length ? bad.map(b => b.params.response.status + " " + b.params.response.url).join(", ") : "none");

console.log("\n--- sidebar social links ---");
for (const s of await evaluate(`[...document.querySelectorAll(".social-link")].map(a => ({
  href: a.href,
  label: a.getAttribute("aria-label"),
  icon: a.querySelector("ion-icon")?.getAttribute("name"),
  target: a.target,
  rel: a.rel,
  rendered: a.getBoundingClientRect().width > 0 && a.getBoundingClientRect().height > 0
}))`)) {
  console.log(`  ${(s.icon || "?").padEnd(16)} ${s.rendered ? "visible" : "NOT VISIBLE"}  target=${s.target || "(none)"} rel="${s.rel}"`);
  console.log(`    href  ${s.href}`);
  console.log(`    label ${s.label}`);
}

// every external link on the page
console.log("\n--- all external links ---");
for (const l of await evaluate(`[...document.querySelectorAll('a[href^="http"]')].map(a => ({h:a.href, t:a.target, r:a.rel}))`))
  console.log(`  ${l.t === "_blank" && l.r.includes("noopener") ? "safe" : "CHECK"}  ${l.h}`);

// icon-only links must still expose an accessible name
console.log("\n--- accessibility: links with no accessible name ---");
const nameless = await evaluate(`[...document.querySelectorAll("a")].filter(a => {
  const txt = (a.textContent || "").trim();
  return !txt && !a.getAttribute("aria-label") && !a.getAttribute("title");
}).map(a => a.getAttribute("href"))`);
console.log(nameless.length ? nameless.map(n => "  MISSING NAME -> " + n).join("\n") : "  none");

const OVERFLOW = `(() => { const vw=document.documentElement.clientWidth, sw=document.documentElement.scrollWidth; return {vw, sw}; })()`;
const showPage = (n) => `document.querySelectorAll("[data-page]").forEach(p => p.classList.toggle("active", p.dataset.page === "${n}"))`;
console.log("");
for (const page of ["about", "resume", "projects", "expertise", "contact"]) {
  await evaluate(showPage(page));
  const problems = [];
  for (const w of [320, 360, 390, 414, 480, 580, 700, 768, 900, 1024, 1200, 1440, 1600]) {
    await setViewport(w, 1000);
    await new Promise((r) => setTimeout(r, 140));
    const res = await evaluate(OVERFLOW);
    if (res.sw > res.vw + 1) problems.push(`w=${w} +${res.sw - res.vw}`);
  }
  console.log(`page "${page}": ${problems.length ? "OVERFLOW " + problems.join(", ") : "ok 320-1600"}`);
}

await evaluate(showPage("about"));
await setViewport(1400, 1100);
await new Promise((r) => setTimeout(r, 500));
const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
writeFileSync("__shot-sidebar.png", Buffer.from(shot.data, "base64"));
console.log("\nwrote __shot-sidebar.png");

ws.close();
process.exit(0);
