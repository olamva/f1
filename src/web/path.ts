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

export const pathSegment = (index: number): string | null => {
  const part = location.pathname.split("/")[index];
  return part ? decodeURIComponent(part) : null;
};

export const openDriver = (id: string) => {
  history.pushState(null, "", `/stats/drivers/${encodeURIComponent(id)}`);
  dispatchEvent(new PopStateEvent("popstate"));
  scrollTo(0, 0);
};
