import { DefaultAzureCredential } from "@azure/identity";
import { F1_ORIGIN } from "./origin.ts";

const STATIC = "https://livetiming.formula1.com/static/";
const ENDPOINT = process.env.SPEECH_ENDPOINT;
const credential = new DefaultAzureCredential({ managedIdentityClientId: process.env.AZURE_CLIENT_ID });
const cache = new Map<string, Promise<string>>();

async function transcribe(path: string): Promise<string> {
  const audio = await fetch(`${F1_ORIGIN}/static/${path}`);
  if (!audio.ok) throw new Error(`radio ${audio.status}`);
  const form = new FormData();
  form.set("file", new File([await audio.blob()], "radio.mp3", { type: "audio/mpeg" }));
  form.set("language", "en");
  const { token } = await credential.getToken("https://cognitiveservices.azure.com/.default");
  const res = await fetch(`${ENDPOINT}openai/deployments/whisper/audio/transcriptions?api-version=2024-06-01`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`transcribe ${res.status}`);
  return ((await res.json()) as { text: string }).text.trim();
}

export function transcript(url: string): Promise<string> | null {
  if (!ENDPOINT || !url.startsWith(STATIC) || url.includes("..")) return null;
  const path = url.slice(STATIC.length);
  if (!cache.has(path)) cache.set(path, transcribe(path).catch((e) => (cache.delete(path), Promise.reject(e))));
  return cache.get(path)!;
}
