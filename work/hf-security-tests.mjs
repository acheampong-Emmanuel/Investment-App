import fs from "node:fs";
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const appPort = Number(process.env.HF_TEST_APP_PORT || 4199);
const mockPort = Number(process.env.HF_TEST_MOCK_PORT || 4198);
const appBase = `http://127.0.0.1:${appPort}`;
const mockBase = `http://127.0.0.1:${mockPort}/v1`;
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const fakeToken = (name) => `hf_${name}`;
const TOKENS = {
  rejected: fakeToken("rejected0000000000"),
  rate: fakeToken("rate00000000000000"),
  timeout: fakeToken("timeout000000000"),
  empty: fakeToken("empty00000000000"),
  malformed: fakeToken("malformed000000"),
  valid: fakeToken("valid0000000000")
};

const mockServer = http.createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/v1/chat/completions") return json(res, 404, { error: "not found" });
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  await readBody(req);
  if (token === TOKENS.rejected) return json(res, 401, { error: "bad token" });
  if (token === TOKENS.rate) return json(res, 429, { error: "rate limit" });
  if (token === TOKENS.timeout) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return json(res, 200, completion("late"));
  }
  if (token === TOKENS.empty) return json(res, 200, completion(""));
  if (token === TOKENS.malformed) return json(res, 200, completion("not json but still useful"));
  if (token === TOKENS.valid) {
    return json(res, 200, completion(JSON.stringify({
      summary: "Mock market analysis generated from sanitized fields.",
      sentimentScore: "Neutral",
      riskFactors: ["Volatility"],
      bullishFactors: ["Source-backed data"],
      bearishFactors: ["Limited fundamentals"],
      dataQuality: "Mocked"
    })));
  }
  return json(res, 403, { error: "unknown token" });
});

await listen(mockServer, mockPort);

const child = spawn(process.execPath, ["server.js"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    PORT: String(appPort),
    NODE_ENV: "test",
    HF_ROUTER_BASE_URL: mockBase,
    HF_TIMEOUT_MS: "60",
    HF_TOKEN_ENCRYPTION_KEY: "test-encryption-key-that-is-not-a-real-secret",
    ALLOWED_ORIGINS: appBase
  },
  stdio: ["ignore", "pipe", "pipe"]
});

try {
  await waitFor(`${appBase}/api/health`);

  const status = await api("GET", "/api/huggingface/status");
  assert(status.body.data.connected === false, "no token connected by default");
  assert(!JSON.stringify(status.body).includes("hf_"), "status response does not expose tokens");

  const noTokenAi = await api("POST", "/api/ai/analyze", { symbol: "AAPL" });
  assert(noTokenAi.status === 401, "AI disabled when no token connected");

  const badFormat = await api("POST", "/api/huggingface/connect", { token: "bad", model: "google/gemma-2-2b-it:fastest" });
  assert(badFormat.status === 400, "invalid token format rejected");

  const rejected = await api("POST", "/api/huggingface/connect", { token: TOKENS.rejected, model: "google/gemma-2-2b-it:fastest" });
  assert(rejected.status === 401, "invalid Hugging Face token rejected before saving");

  const rateLimited = await api("POST", "/api/huggingface/connect", { token: TOKENS.rate, model: "google/gemma-2-2b-it:fastest" });
  assert(rateLimited.status === 429, "rate-limit errors are surfaced");

  const timeout = await api("POST", "/api/huggingface/connect", { token: TOKENS.timeout, model: "google/gemma-2-2b-it:fastest" });
  assert(timeout.status === 504, "timeout errors are surfaced");

  const connected = await api("POST", "/api/huggingface/connect", { token: TOKENS.valid, model: "google/gemma-2-2b-it:fastest" });
  assert(connected.status === 200 && connected.body.data.connected === true, "valid token connects");
  assert(!JSON.stringify(connected.body).includes(TOKENS.valid), "connect response does not expose token");
  const cookie = connected.headers.get("set-cookie")?.split(";")[0];
  assert(cookie, "connect sets HttpOnly session cookie");

  const tested = await api("POST", "/api/huggingface/test", { model: "google/gemma-2-2b-it:fastest" }, cookie);
  assert(tested.status === 200 && tested.body.data.connected === true, "test connection works with backend session");

  const analyzed = await api("POST", "/api/ai/analyze", { symbol: "AAPL", quote: { price: 100, source: "Mock" } }, cookie);
  assert(analyzed.status === 200 && analyzed.body.data.available === true, "AI analyze works with connected token");

  const disconnected = await api("POST", "/api/huggingface/disconnect", {}, cookie);
  assert(disconnected.status === 200 && disconnected.body.data.connected === false, "disconnect clears backend session");

  const afterDisconnect = await api("POST", "/api/ai/analyze", { symbol: "AAPL" }, cookie);
  assert(afterDisconnect.status === 401, "AI disabled after disconnect");

  const malformed = await api("POST", "/api/huggingface/connect", { token: TOKENS.malformed, model: "google/gemma-2-2b-it:fastest" });
  const malformedCookie = malformed.headers.get("set-cookie")?.split(";")[0];
  const malformedAi = await api("POST", "/api/ai/analyze", { symbol: "AAPL" }, malformedCookie);
  assert(malformedAi.status === 200 && malformedAi.body.data.summary.includes("not json"), "malformed model response falls back cleanly");

  const empty = await api("POST", "/api/huggingface/connect", { token: TOKENS.empty, model: "google/gemma-2-2b-it:fastest" });
  const emptyCookie = empty.headers.get("set-cookie")?.split(";")[0];
  const emptyAi = await api("POST", "/api/ai/analyze", { symbol: "AAPL" }, emptyCookie);
  assert(emptyAi.status === 200 && /empty response/i.test(emptyAi.body.data.summary), "empty model response is handled");

  const frontend = `${fs.readFileSync(`${repoRoot}/index.html`, "utf8")}\n${fs.readFileSync(`${repoRoot}/app.js`, "utf8")}`;
  assert(!/localStorage\.setItem\([^)]*hf/i.test(frontend), "frontend does not store HF token");
  assert(!/sessionStorage|indexedDB/i.test(frontend), "frontend does not use sessionStorage or IndexedDB for HF token");
  assert(!frontend.includes("router.huggingface.co/v1/chat/completions"), "frontend does not call Hugging Face directly");

  console.log("ok Hugging Face security integration");
} finally {
  child.kill();
  mockServer.close();
}

async function api(method, path, body, cookie = "") {
  const response = await fetch(`${appBase}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, headers: response.headers, body: payload };
}

function completion(content) {
  return { choices: [{ message: { content } }] };
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function listen(server, port) {
  return new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => resolve(body));
  });
}

async function waitFor(url) {
  const started = Date.now();
  while (Date.now() - started < 5000) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`ok ${message}`);
}
