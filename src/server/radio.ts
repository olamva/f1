import { DefaultAzureCredential } from "@azure/identity";
import { F1_ORIGIN } from "./origin.ts";

const STATIC = "https://livetiming.formula1.com/static/";
const ENDPOINT = process.env.SPEECH_ENDPOINT;
const credential = new DefaultAzureCredential({ managedIdentityClientId: process.env.AZURE_CLIENT_ID });
const cache = new Map<string, Promise<Turn[]>>();

export interface Turn {
  speaker: "driver" | "engineer";
  text: string;
}

const TURNS = {
  type: "object",
  additionalProperties: false,
  required: ["turns"],
  properties: {
    turns: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["speaker", "text"],
        properties: { speaker: { enum: ["driver", "engineer"] }, text: { type: "string" } },
      },
    },
  },
};

const pathOf = (url: string) => (url.startsWith(STATIC) && !url.includes("..") ? url.slice(STATIC.length) : null);

export const audio = (url: string) => {
  const path = pathOf(url);
  return path ? fetch(`${F1_ORIGIN}/static/${path}`) : null;
};

const openai = async (path: string, body: FormData | string) => {
  const { token } = await credential.getToken("https://cognitiveservices.azure.com/.default");
  const res = await fetch(`${ENDPOINT}openai/deployments/${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, ...(typeof body === "string" && { "content-type": "application/json" }) },
    body,
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
};

async function transcribe(path: string): Promise<Turn[]> {
  const audio = await fetch(`${F1_ORIGIN}/static/${path}`);
  if (!audio.ok) throw new Error(`radio ${audio.status}`);
  const form = new FormData();
  form.set("file", new File([await audio.blob()], "radio.mp3", { type: "audio/mpeg" }));
  form.set("language", "en");
  const { text } = (await openai("whisper/audio/transcriptions?api-version=2024-06-01", form)) as { text: string };
  const { choices } = await openai(
    "turns/chat/completions?api-version=2024-10-21",
    JSON.stringify({
      temperature: 0,
      response_format: { type: "json_schema", json_schema: { name: "turns", strict: true, schema: TURNS } },
      messages: [
        {
          role: "system",
          content:
            "Split this Formula 1 team radio transcript into consecutive turns by the driver and the race engineer. Keep every word in order and unchanged. The file name contains the driver code.",
        },
        { role: "user", content: `File: ${path}\nTranscript: ${text.trim()}` },
      ],
    }),
  );
  return (JSON.parse(choices[0].message.content) as { turns: Turn[] }).turns;
}

export function transcript(url: string): Promise<Turn[]> | null {
  const path = pathOf(url);
  if (!ENDPOINT || !path) return null;
  if (!cache.has(path)) cache.set(path, transcribe(path).catch((e) => (cache.delete(path), Promise.reject(e))));
  return cache.get(path)!;
}
