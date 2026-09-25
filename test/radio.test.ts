import assert from "node:assert/strict";
import { test } from "node:test";
import { split } from "../src/server/radio.ts";

const word = (word: string, start: number) => ({
  word,
  start,
  end: start + 0.2,
});

test("radio turns follow the voice that spoke each word", () => {
  const text = "Park up, mate. Are you sure? Stop there. Let me try.";
  const words = [
    word("Park", 0.1),
    word("up", 0.3),
    word("mate", 0.5),
    word("Are", 1.5),
    word("you", 1.7),
    word("sure", 1.9),
    word("Stop", 3.1),
    word("there", 3.3),
    word("Let", 4.6),
    word("me", 4.8),
    word("try", 5),
  ];
  const phrases = [
    { speaker: 1, offsetMilliseconds: 0, durationMilliseconds: 800 },
    { speaker: 2, offsetMilliseconds: 1400, durationMilliseconds: 800 },
    { speaker: 1, offsetMilliseconds: 3000, durationMilliseconds: 600 },
    { speaker: 2, offsetMilliseconds: 4700, durationMilliseconds: 500 },
  ];
  assert.deepEqual(split(text, words, phrases), [
    { speaker: 1, text: "Park up, mate." },
    { speaker: 2, text: "Are you sure?" },
    { speaker: 1, text: "Stop there." },
    { speaker: 2, text: "Let me try." },
  ]);
});

test("radio text stays whole when no voice is found", () => {
  assert.deepEqual(
    split("Something broke.", [word("Something", 0), word("broke", 0.4)], []),
    [{ speaker: 1, text: "Something broke." }],
  );
});

test("radio sentence stays with the voice of most of its words", () => {
  const text = "We can see. It is not only on the straight though.";
  const words = [
    "We",
    "can",
    "see",
    "It",
    "is",
    "not",
    "only",
    "on",
    "the",
    "straight",
    "though",
  ].map((w, i) => word(w, i * 0.3));
  const phrases = [
    { speaker: 2, offsetMilliseconds: 0, durationMilliseconds: 2500 },
    { speaker: 1, offsetMilliseconds: 2600, durationMilliseconds: 1000 },
  ];
  assert.deepEqual(split(text, words, phrases), [
    { speaker: 2, text: "We can see. It is not only on the straight though." },
  ]);
});
