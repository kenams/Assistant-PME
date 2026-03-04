const startTime = Date.now();

const counters = {
  totalRequests: 0,
  totalErrors: 0,
  totalDurationMs: 0,
  byStatus: {},
  byRoute: {}
};

function recordRequest({ path, method, status, durationMs }) {
  counters.totalRequests += 1;
  counters.totalDurationMs += durationMs;
  if (status >= 400) {
    counters.totalErrors += 1;
  }
  const statusKey = String(status);
  counters.byStatus[statusKey] = (counters.byStatus[statusKey] || 0) + 1;
  const routeKey = `${method} ${path}`;
  counters.byRoute[routeKey] = (counters.byRoute[routeKey] || 0) + 1;
}

function getSnapshot() {
  const uptimeSeconds = Math.floor(process.uptime());
  const avgLatency =
    counters.totalRequests > 0
      ? Math.round(counters.totalDurationMs / counters.totalRequests)
      : 0;
  const errorRate =
    counters.totalRequests > 0
      ? Math.round((counters.totalErrors / counters.totalRequests) * 100)
      : 0;
  const memory = process.memoryUsage();

  return {
    since: new Date(startTime).toISOString(),
    uptime_seconds: uptimeSeconds,
    total_requests: counters.totalRequests,
    total_errors: counters.totalErrors,
    error_rate: errorRate,
    avg_latency_ms: avgLatency,
    memory_mb: {
      rss: Math.round(memory.rss / 1024 / 1024),
      heap_used: Math.round(memory.heapUsed / 1024 / 1024),
      heap_total: Math.round(memory.heapTotal / 1024 / 1024)
    },
    top_routes: Object.entries(counters.byRoute)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([route, count]) => ({ route, count })),
    by_status: counters.byStatus
  };
}

module.exports = { recordRequest, getSnapshot };
