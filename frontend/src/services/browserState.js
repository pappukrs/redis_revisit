// Utility functions for handling browser‑side state safely
export const clearBrowserState = () => {
  // Clear Web Storage
  try { localStorage.clear(); } catch (e) {}
  try { sessionStorage.clear(); } catch (e) {}
  // Clear cookies (simple approach – expires them)
  document.cookie.split(';').forEach(c => {
    const eqPos = c.indexOf('=');
    const name = eqPos > -1 ? c.substr(0, eqPos) : c;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  });
  // Clear IndexedDB databases (if any)
  if (window.indexedDB && indexedDB.databases) {
    indexedDB.databases().then(dbs => {
      dbs.forEach(db => indexedDB.deleteDatabase(db.name));
    }).catch(() => {});
  }
};

// Placeholder for future secure storage – encrypts before persisting
export const secureStore = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
};
