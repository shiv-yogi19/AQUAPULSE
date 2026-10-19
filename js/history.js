const K = "aquapulse.history.v1";
export function load() { try { return JSON.parse(localStorage.getItem(K)) || []; } catch { return []; } }
export function save(r) { try { const a = load(); a.unshift(r); localStorage.setItem(K, JSON.stringify(a.slice(0, 20))); return true; } catch { return false; } }
export function clear() { try { localStorage.removeItem(K); return true; } catch { return false; } }
export function available() { try { localStorage.setItem("_t", "1"); localStorage.removeItem("_t"); return true; } catch { return false; } }
