import { DefaultAzureCredential } from "@azure/identity";
import { F1_ORIGIN } from "./origin.ts";

const STATIC = "https://livetiming.formula1.com/static/";
const ENDPOINT = process.env.SPEECH_ENDPOINT;
const VOICE = process.env.VOICE_ENDPOINT;
const STORE = process.env.TRANSCRIPT_STORE;
const credential = new DefaultAzureCredential({ managedIdentityClientId: process.env.AZURE_CLIENT_ID });
const cache = new Map<string, Promise<Turn[]>>();

export interface Turn {
  speaker: "driver" | "engineer";
  text: string;
}

const ROLES = {
  type: "object",
  additionalProperties: false,
  required: ["driver"],
  properties: { driver: { type: "integer" } },
};

const pathOf = (url: string) => (url.startsWith(STATIC) && !url.includes("..") ? url.slice(STATIC.length) : null);

export const audio = (url: string) => {
  const path = pathOf(url);
  return path ? fetch(`${F1_ORIGIN}/static/${path}`) : null;
};

const post = async (url: string, body: FormData | string): Promise<any> => {
  const { token } = await credential.getToken("https://cognitiveservices.azure.com/.default");
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, ...(typeof body === "string" && { "content-type": "application/json" }) },
    body,
  });
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, Number(res.headers.get("retry-after") ?? 10) * 1000));
    return post(url, body);
  }
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
};

const blob = async (path: string, init: RequestInit = {}) => {
  const { token } = await credential.getToken("https://storage.azure.com/.default");
  return fetch(`${STORE}/voice/${encodeURI(path)}.json`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "x-ms-version": "2023-11-03", ...init.headers },
  });
};

async function stored(path: string): Promise<Turn[]> {
  const hit = STORE ? await blob(path) : null;
  if (hit?.ok) return hit.json();
  const turns = await transcribe(path);
  if (STORE) {
    const res = await blob(path, {
      method: "PUT",
      headers: { "x-ms-blob-type": "BlockBlob", "content-type": "application/json" },
      body: JSON.stringify(turns),
    });
    if (!res.ok) console.error("transcript store:", res.status);
  }
  return turns;
}

async function transcribe(path: string): Promise<Turn[]> {
  const audio = await fetch(`${F1_ORIGIN}/static/${path}`);
  if (!audio.ok) throw new Error(`radio ${audio.status}`);
  const form = new FormData();
  form.set("audio", new File([await audio.blob()], "radio.mp3", { type: "audio/mpeg" }));
  form.set("definition", JSON.stringify({ locales: ["en-GB"], diarization: { enabled: true, maxSpeakers: 2 } }));
  const { phrases } = (await post(`${VOICE}speechtotext/transcriptions:transcribe?api-version=2024-11-15`, form)) as {
    phrases: { speaker: number; text: string }[];
  };
  if (!phrases.length) return [];
  const { choices } = await post(
    `${ENDPOINT}openai/deployments/turns/chat/completions?api-version=2024-10-21`,
    JSON.stringify({
      temperature: 0,
      response_format: { type: "json_schema", json_schema: { name: "roles", strict: true, schema: ROLES } },
      messages: [
        {
          role: "system",
          content:
            "This Formula 1 team radio is split into phrases by voice. Each speaker number is one voice: the driver or the race engineer. Return the speaker number of the driver, or 0 if the driver does not speak. The file name contains the driver code.",
        },
        { role: "user", content: `File: ${path}\n${phrases.map((p) => `Speaker ${p.speaker}: ${p.text}`).join("\n")}` },
      ],
    }),
  );
  const { driver } = JSON.parse(choices[0].message.content) as { driver: number };
  return phrases.reduce<Turn[]>((turns, p) => {
    const speaker = p.speaker === driver ? "driver" : "engineer";
    const last = turns.at(-1);
    if (last?.speaker === speaker) last.text += ` ${p.text}`;
    else turns.push({ speaker, text: p.text });
    return turns;
  }, []);
}

export function transcript(url: string): Promise<Turn[]> | null {
  const path = pathOf(url);
  if (!ENDPOINT || !VOICE || !path) return null;
  if (!cache.has(path)) cache.set(path, stored(path).catch((e) => (cache.delete(path), Promise.reject(e))));
  return cache.get(path)!;
}
