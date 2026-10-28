export const ink = (color?: string) =>
  color && `light-dark(oklch(from ${color} min(l, 0.65) c h), ${color})`;
