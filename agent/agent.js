/**
 * KAH IT Agent — agent local léger
 * Expose http://localhost:47878/info avec les infos du poste
 * Compatible Chrome Private Network Access (OPTIONS preflight)
 */
const http = require("http");
const os = require("os");

const PORT = 47878;
const HOST = "127.0.0.1";

function getLocalIp() {
  const ifaces = os.networkInterfaces();
  const preferred = [];
  const fallback = [];
  for (const name of Object.keys(ifaces)) {
    const lc = name.toLowerCase();
    const isVirtual =
      lc.includes("virtual") ||
      lc.includes("vmware") ||
      lc.includes("vbox") ||
      lc.includes("loopback") ||
      lc.includes("docker") ||
      lc.includes("wsl");
    for (const iface of ifaces[name]) {
      if (iface.family !== "IPv4" || iface.internal) continue;
      if (isVirtual) fallback.push(iface.address);
      else preferred.push(iface.address);
    }
  }
  return preferred[0] || fallback[0] || "127.0.0.1";
}

function getOsLabel() {
  const type = os.type();
  const release = os.release();
  if (type === "Windows_NT") {
    const build = parseInt((release.split(".")[2] || "0"), 10);
    if (build >= 22000) return `Windows 11 (build ${build})`;
    if (build >= 10000) return `Windows 10 (build ${build})`;
    return `Windows (${release})`;
  }
  if (type === "Darwin") return `macOS ${release}`;
  return `${type} ${release}`;
}

function getUsername() {
  try {
    return os.userInfo().username;
  } catch (_) {
    return process.env.USERNAME || process.env.USER || "inconnu";
  }
}

const INFO = JSON.stringify({
  hostname: os.hostname(),
  username: getUsername(),
  local_ip: getLocalIp(),
  os: getOsLabel(),
  platform: os.platform(),
  arch: os.arch(),
  agent_version: "1.0.0"
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Private-Network": "true"
};

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }
  res.writeHead(200, {
    ...CORS_HEADERS,
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(INFO)
  });
  res.end(INFO);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    // Already running — exit silently
    process.exit(0);
  }
  process.exit(1);
});

server.listen(PORT, HOST);
