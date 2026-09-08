import { hamiltonian } from './kerr.ts';
import { releaseProbe, stepFlight, type Flight } from './flight.ts';
const VERSION = 'kerr-rk4-005-quarter-M-v2';
export const PATH_STEP = 0.25;
const memory = new Map<string, Flight[]>();
export function sampleFlightPath(path: Flight[], properTime: number) {
  return path[
    Math.min(path.length - 1, Math.max(0, Math.floor(properTime / PATH_STEP)))
  ];
}
export async function loadFlightPath(
  radius: number,
  inclination: number,
  spin: number,
): Promise<Flight[]> {
  const key = JSON.stringify([VERSION, radius, inclination, spin]);
  if (memory.has(key)) return memory.get(key)!;
  let db: IDBDatabase | undefined;
  try {
    if (typeof indexedDB !== 'undefined')
      db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('ad-astra-numerical-cache', 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore('paths');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    if (db) {
      const stored = await new Promise<Flight[] | undefined>(
        (resolve, reject) => {
          const r = db!.transaction('paths').objectStore('paths').get(key);
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        },
      );
      if (
        stored &&
        stored.length > 2 &&
        stored.length < 2000 &&
        stored.at(-1)?.complete &&
        stored.every(
          (f, i) =>
            Array.isArray(f.state) &&
            f.state.length === 6 &&
            f.state.every(Number.isFinite) &&
            f.spin === spin &&
            Number.isFinite(f.pt) &&
            f.residual < 1e-6 &&
            f.properTime >= (i - 1) * PATH_STEP - 0.01 &&
            f.properTime <= i * PATH_STEP + 0.01 &&
            Math.abs(hamiltonian(f.state, f.pt, spin) + 0.5) < 1e-6,
        )
      ) {
        memory.set(key, stored);
        db.close();
        return stored;
      }
    }
  } catch {
    db?.close();
    db = undefined;
  }
  const path = [releaseProbe(radius, inclination, spin)];
  while (!path.at(-1)!.complete && path.length < 2000) {
    path.push(stepFlight(path.at(-1)!, PATH_STEP));
    if (path.length % 24 === 0)
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  if (!path.at(-1)!.complete)
    throw new Error('Trajectory exceeded preparation budget.');
  memory.set(key, path);
  if (memory.size > 4) memory.delete(memory.keys().next().value!);
  if (db) {
    try {
      const tx = db.transaction('paths', 'readwrite');
      const store = tx.objectStore('paths');
      store.put(path, key);
      const keys = store.getAllKeys();
      keys.onsuccess = () => {
        const old = keys.result.filter((k) => k !== key);
        while (old.length > 3) store.delete(old.shift()!);
      };
      tx.oncomplete = () => db?.close();
      tx.onerror = () => db?.close();
    } catch {
      db.close();
    }
  }
  return path;
}
