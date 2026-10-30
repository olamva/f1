export const ink = (color?: string) =>
  color &&
  (color.startsWith("light-dark(")
    ? color
    : `light-dark(oklch(from ${color} min(l, 0.65) c h), ${color})`);
