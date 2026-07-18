import { MAIN_RENDERER_URL } from "./constants.mjs";

function loopbackUrl(port, pathname = "/json/list") {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("CDP port must be between 1024 and 65535");
  return `http://127.0.0.1:${port}${pathname}`;
}

export function filterRendererTargets(targets) {
  if (!Array.isArray(targets)) return [];
  return targets.filter((target) =>
    target?.type === "page" &&
    target?.url === MAIN_RENDERER_URL &&
    typeof target?.webSocketDebuggerUrl === "string" &&
    /^ws:\/\/(127\.0\.0\.1|localhost):\d+\//.test(target.webSocketDebuggerUrl),
  );
}

export async function fetchRendererTargets(port, { timeoutMs = 1200, fetchImpl = globalThis.fetch } = {}) {
  const signal = AbortSignal.timeout(timeoutMs);
  const response = await fetchImpl(loopbackUrl(port), { signal });
  if (!response.ok) throw new Error(`CDP endpoint returned HTTP ${response.status}`);
  return filterRendererTargets(await response.json());
}

export class CdpSession {
  constructor(url, { WebSocketImpl = globalThis.WebSocket, timeoutMs = 4000 } = {}) {
    if (!/^ws:\/\/(127\.0\.0\.1|localhost):\d+\//.test(url)) throw new Error("CDP WebSocket must use loopback");
    if (typeof WebSocketImpl !== "function") throw new Error("Node.js 22 or newer is required for WebSocket support");
    this.url = url;
    this.WebSocketImpl = WebSocketImpl;
    this.timeoutMs = timeoutMs;
    this.nextId = 1;
    this.pending = new Map();
  }

  async open() {
    this.socket = new this.WebSocketImpl(this.url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("CDP WebSocket connection timed out")), this.timeoutMs);
      const fail = (event) => {
        clearTimeout(timer);
        reject(event?.error ?? new Error("CDP WebSocket failed"));
      };
      this.socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
      this.socket.addEventListener("error", fail, { once: true });
    });
    this.socket.addEventListener("message", (event) => this.#message(event));
    this.socket.addEventListener("close", () => this.#close());
    return this;
  }

  #message(event) {
    let message;
    try { message = JSON.parse(String(event.data)); } catch { return; }
    if (!message.id || !this.pending.has(message.id)) return;
    const pending = this.pending.get(message.id);
    this.pending.delete(message.id);
    clearTimeout(pending.timer);
    if (message.error) pending.reject(new Error(message.error.message ?? "CDP command failed"));
    else pending.resolve(message.result);
  }

  #close() {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error("CDP WebSocket closed"));
    }
    this.pending.clear();
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: false,
    });
    if (result?.exceptionDetails) throw new Error(result.exceptionDetails.text ?? "renderer evaluation failed");
    return result?.result?.value;
  }

  close() {
    this.socket?.close();
  }
}
