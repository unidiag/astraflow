// Converts non-serializable values to serializable equivalents
export function toSerializable(value) {
  if (value instanceof Date) return value.getTime(); // number (ms)
  if (Array.isArray(value)) return value.map(toSerializable);
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value)) {
      // avoid functions, DOM nodes, etc.
      const v = value[k];
      if (typeof v === "function") continue;
      out[k] = toSerializable(v);
    }
    return out;
  }
  return value; // primitives stay as is
}