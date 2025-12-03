// src/lib/utils.ts
export function getRefFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  // 简单校验一下是不是合法的 Solana 地址（32~44位 base58）
  if (ref && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(ref)) {
    return ref;
  }
  return null;
}