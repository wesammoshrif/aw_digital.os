/**
 * Auth-Primitive (Edge- und Node-tauglich, KEIN node:crypto).
 *
 * Diese Datei wird von der Middleware (Edge-Runtime) UND von den
 * Route-Handlern (Node-Runtime) genutzt. Deshalb nur Web-APIs (atob,
 * TextEncoder), keine Node-spezifischen Module.
 */

/** Konstantzeit-Vergleich zweier Strings (gegen Timing-Seitenkanal). */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  // Längendifferenz fließt ins Ergebnis ein; der Loop läuft konstant über ab,
  // damit die Laufzeit nicht vom Inhalt abhängt.
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < ab.length; i++) {
    diff |= ab[i] ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

/** Prüft einen HTTP-Basic-`Authorization`-Header zeitkonstant. */
export function verifyBasicAuth(
  header: string | null,
  expectedUser: string,
  password: string,
): boolean {
  if (!header || !header.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const sep = decoded.indexOf(":");
  if (sep < 0) return false;
  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);
  // Beide Vergleiche immer ausführen (kein &&-Kurzschluss vor dem zweiten).
  const userOk = timingSafeEqualStr(user, expectedUser);
  const passOk = timingSafeEqualStr(pass, password);
  return userOk && passOk;
}
