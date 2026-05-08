/**
 * CloudStay API Service — Multi-cloud failover
 *
 * Priority order: AWS (primary) → Oracle (fallback)
 * If AWS is unreachable, all requests automatically route to Oracle.
 * Health is re-checked every 30s so recovery is detected automatically.
 */

const BACKENDS = [
  { name: "AWS",    base: "http://52.206.184.80:8000" },
  { name: "Oracle", base: "http://152.67.188.94:8000" },
];

let activeIndex = 0;      // index of currently healthy backend
let failoverInProgress = false;

// ── Health probe ─────────────────────────────────────────────────────────────
async function probeBackend(index) {
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), 4000);   // 4s timeout
    const res = await fetch(`${BACKENDS[index].base}/health/`, { signal: ctrl.signal });
    clearTimeout(id);
    return res.ok;
  } catch {
    return false;
  }
}

// Periodically try to recover the primary backend
setInterval(async () => {
  if (activeIndex !== 0) {
    const primaryUp = await probeBackend(0);
    if (primaryUp) {
      console.log("[CloudStay LB] Primary (AWS) recovered — switching back");
      activeIndex = 0;
    }
  }
}, 30000);

// ── Core fetch with failover ──────────────────────────────────────────────────
export async function apiFetch(path, options = {}, token = null) {
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  // Try current backend, then the other one
  for (let attempt = 0; attempt < BACKENDS.length; attempt++) {
    const idx = (activeIndex + attempt) % BACKENDS.length;
    const url = `${BACKENDS[idx].base}${path}`;

    try {
      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), 8000);

      const res = await fetch(url, {
        ...options,
        headers,
        signal: ctrl.signal,
      });
      clearTimeout(timeoutId);

      // Succeeded — if we used a fallback, update activeIndex
      if (attempt > 0) {
        console.warn(`[CloudStay LB] Switched to ${BACKENDS[idx].name} after primary failed`);
        activeIndex = idx;
      }

      return res;
    } catch (err) {
      console.warn(`[CloudStay LB] ${BACKENDS[idx].name} unreachable (${err.message}), trying next...`);
    }
  }

  throw new Error("All cloud backends are unreachable. Please try again shortly.");
}

// ── Active backend info (for UI display) ─────────────────────────────────────
export function getActiveBackend() {
  return BACKENDS[activeIndex];
}

export async function checkAllBackends() {
  const results = await Promise.all(
    BACKENDS.map(async (b, i) => ({
      name: b.name,
      base: b.base,
      up: await probeBackend(i),
    }))
  );
  return results;
}
