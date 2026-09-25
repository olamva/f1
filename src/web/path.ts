export const pathPart = (prefix: string): string | null => {
  const [, head, part] = location.pathname.split("/");
  return head === prefix && part ? decodeURIComponent(part) : null;
};

export const setPathPart = (prefix: string, part: string | null) =>
  history.replaceState(
    null,
    "",
    `/${prefix}${part ? `/${encodeURIComponent(part)}` : ""}`,
  );
