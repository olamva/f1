export const hashPart = (prefix: string): string | null => {
  const [head, part] = location.hash.slice(1).split("/");
  return head === prefix && part ? decodeURIComponent(part) : null;
};

export const setHashPart = (prefix: string, part: string | null) =>
  history.replaceState(null, "", `#${prefix}${part ? `/${encodeURIComponent(part)}` : ""}`);
