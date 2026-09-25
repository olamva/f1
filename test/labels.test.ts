import assert from "node:assert/strict";
import { test } from "node:test";
import { placeLabels } from "../src/web/live/labels.ts";

const box = (x: number, y: number, h: number, dx: number, dy: number) => [x + dx - 28, y + dy - h / 2, x + dx + 28, y + dy + h / 2];

test("labels of clustered cars do not overlap each other or any car", () => {
  const cars = [
    { number: "1", x: 500, y: 500, h: 26 },
    { number: "2", x: 510, y: 505, h: 54 },
    { number: "3", x: 490, y: 515, h: 26 },
    { number: "4", x: 520, y: 490, h: 26 },
    { number: "5", x: 505, y: 520, h: 26 },
  ];
  const labels = placeLabels(cars);
  const boxes = cars.map((c) => box(c.x, c.y, c.h, labels[c.number]!.dx, labels[c.number]!.dy));
  const dots = cars.map((c) => [c.x - 18, c.y - 18, c.x + 18, c.y + 18]);
  const hit = (a: number[], b: number[]) => a[0]! < b[2]! && b[0]! < a[2]! && a[1]! < b[3]! && b[1]! < a[3]!;
  boxes.forEach((a, i) => {
    boxes.slice(i + 1).forEach((b) => assert.ok(!hit(a, b)));
    dots.forEach((d) => assert.ok(!hit(a, d)));
  });
});

test("a lone car keeps its label directly above the dot", () => {
  assert.deepEqual(placeLabels([{ number: "1", x: 500, y: 500, h: 26 }])["1"], { dx: 0, dy: -35, lead: false });
});
