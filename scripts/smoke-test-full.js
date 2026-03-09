const baseUrl = process.env.ASSISTANT_BASE_URL || "http://localhost:3001";
const email = process.env.ASSISTANT_SMOKE_EMAIL || "admin@assistant.local";
const password = process.env.ASSISTANT_SMOKE_PASSWORD || "admin123";

const { execFileSync } = require("node:child_process");
let forceCurl = false;

function curlRequest(url, options) {
  const method = (options.method || "GET").toUpperCase();
  const headers = options.headers || {};
  const body = options.body;
  const args = ["-sS", "-f", "-X", method];
  Object.entries(headers).forEach(([key, value]) => {
    args.push("-H", `${key}: ${value}`);
  });
  if (body) {
    args.push("-d", body);
  }
  args.push(url);
  const output = execFileSync("curl", args, { encoding: "utf8" });
  const contentType = headers["Content-Type"] || headers["content-type"] || "";
  if (contentType.includes("application/json")) {
    return JSON.parse(output);
  }
  if (output.trim().startsWith("{") || output.trim().startsWith("[")) {
    try {
      return JSON.parse(output);
    } catch (err) {
      return output;
    }
  }
  return output;
}

async function request(path, options = {}) {
  const targets = [baseUrl];
  if (baseUrl.includes("localhost")) {
    targets.push(baseUrl.replace("localhost", "127.0.0.1"));
  }
  let lastError = null;
  for (const origin of targets) {
    const url = `${origin}${path}`;
    try {
      if (forceCurl) {
        return curlRequest(url, options);
      }
      const res = await fetch(url, options);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status} ${path}: ${text}`);
      }
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return res.json();
      }
      return res.text();
    } catch (err) {
      lastError = err;
      forceCurl = true;
    }
  }
  throw lastError || new Error("fetch_failed");
}

async function run() {
  console.log(`Smoke test full: ${baseUrl}`);

  await request("/health");

  const login = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!login || !login.token) {
    throw new Error("Login failed: missing token");
  }

  const authHeaders = { Authorization: `Bearer ${login.token}` };

  await request("/auth/me", { headers: authHeaders });
  await request("/chat/quick-issues", { headers: authHeaders });

  const chat = await request("/chat", {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Outlook ne s'ouvre pas" })
  });

  if (!chat || !chat.conversation_id) {
    throw new Error("Chat failed: missing conversation_id");
  }

  await request("/chat/feedback", {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_id: chat.conversation_id,
      resolved: false,
      comment: "Toujours en panne"
    })
  });

  const secondFeedback = await request("/chat/feedback", {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_id: chat.conversation_id,
      resolved: false,
      comment: "Toujours en panne"
    })
  });

  if (!secondFeedback || !secondFeedback.ticket_created) {
    throw new Error("Ticket not created after escalation feedback");
  }

  const tickets = await request(`/tickets/conversation/${chat.conversation_id}`, {
    headers: authHeaders
  });

  if (!tickets || !Array.isArray(tickets.items) || tickets.items.length === 0) {
    throw new Error("No ticket found for conversation");
  }

  console.log("Smoke test full OK");
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
