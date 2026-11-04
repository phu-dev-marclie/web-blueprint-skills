// Main thread: executes scripts relayed by ui.html and returns serialisable results.
figma.showUI(__html__, { width: 300, height: 110, title: "HTML → Figma Bridge" });

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
// Shared state that survives between scripts while the plugin stays open.
const ctx = {};

function serialise(value) {
  try {
    return JSON.parse(JSON.stringify(value === undefined ? null : value));
  } catch (e) {
    return String(value);
  }
}

figma.ui.onmessage = async (msg) => {
  if (!msg || msg.type !== "run") return;
  try {
    const fn = new AsyncFunction("figma", "ctx", msg.code);
    const result = await fn(figma, ctx);
    figma.ui.postMessage({ type: "result", id: msg.id, ok: true, result: serialise(result) });
  } catch (e) {
    // QuickJS stacks do not repeat the message: send both (syntax errors only have the message + "<input>:line:col").
    const err = e && e.message ? e.name + ": " + e.message + "\n" + (e.stack || "") : String(e);
    figma.ui.postMessage({ type: "result", id: msg.id, ok: false, error: err });
  }
};
