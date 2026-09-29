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

export const pathSegment = (prefix: string, index: number): string | null => {
  const parts = location.pathname.split("/");
  return parts[1] === prefix && parts[index]
    ? decodeURIComponent(parts[index])
    : null;
};

export const standalone = matchMedia("(display-mode: standalone)").matches;

export const navigate = (url: string) =>
  history[standalone ? "replaceState" : "pushState"](null, "", url);

export const openDriver = (id: string) => {
  navigate(`/stats/drivers/${encodeURIComponent(id)}`);
  dispatchEvent(new PopStateEvent("popstate"));
  scrollTo(0, 0);
};
