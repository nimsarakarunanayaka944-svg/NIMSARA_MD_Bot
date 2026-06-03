import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import { logger } from "../lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempFolder = path.join(__dirname, "../../temp");
const dataFolder = path.join(__dirname, "../../data");

if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder, { recursive: true });
if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder, { recursive: true });

const CLEANUP_TIME = 10 * 60 * 1000;

const sessionMessageStores = new Map<string, Map<string, unknown>>();
const sessionMediaStores = new Map<string, Map<string, string>>();

function getMessageStore(sessionId: string) {
  if (!sessionMessageStores.has(sessionId))
    sessionMessageStores.set(sessionId, new Map());
  return sessionMessageStores.get(sessionId)!;
}

function getMediaStore(sessionId: string) {
  if (!sessionMediaStores.has(sessionId))
    sessionMediaStores.set(sessionId, new Map());
  return sessionMediaStores.get(sessionId)!;
}

function getStateFile(sessionId: string) {
  return path.join(dataFolder, `antidelete_state_${sessionId}.json`);
}

export function loadState(sessionId: string): Record<string, boolean> {
  try {
    const file = getStateFile(sessionId);
    if (fs.existsSync(file))
      return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, boolean>;
  } catch {}
  return {};
}

export function saveState(
  sessionId: string,
  state: Record<string, boolean>
): void {
  try {
    fs.writeFileSync(getStateFile(sessionId), JSON.stringify(state, null, 2));
  } catch {}
}

export function isAntiDeleteEnabled(sessionId: string, jid: string): boolean {
  try {
    return loadState(sessionId)[jid] === true;
  } catch {
    return false;
  }
}

function unwrapMessage(message: unknown): unknown {
  if (!message) return null;
  const m = message as Record<string, unknown>;
  if (m["ephemeralMessage"])
    return unwrapMessage((m["ephemeralMessage"] as Record<string, unknown>)["message"]);
  if (m["viewOnceMessageV2"])
    return unwrapMessage((m["viewOnceMessageV2"] as Record<string, unknown>)["message"]);
  if (m["viewOnceMessage"])
    return unwrapMessage((m["viewOnceMessage"] as Record<string, unknown>)["message"]);
  return message;
}

function getExtension(type: string, msg: unknown): string {
  const m = msg as Record<string, Record<string, string>>;
  switch (type) {
    case "imageMessage": return ".jpg";
    case "videoMessage": return ".mp4";
    case "audioMessage": return ".ogg";
    case "stickerMessage": return ".webp";
    case "documentMessage":
      return m["documentMessage"]?.["fileName"]
        ? path.extname(m["documentMessage"]["fileName"])
        : ".bin";
    default: return ".bin";
  }
}

export async function onMessage(
  conn: unknown,
  msg: unknown,
  sessionId: string
): Promise<void> {
  const m = msg as Record<string, unknown>;
  if (!m["message"] || (m["key"] as Record<string, unknown>)["fromMe"]) return;

  const keyId = (m["key"] as Record<string, unknown>)["id"] as string;
  const messageStore = getMessageStore(sessionId);
  const mediaStore = getMediaStore(sessionId);

  const cleanMessage = unwrapMessage(m["message"]);
  if (!cleanMessage) return;

  messageStore.set(keyId, {
    key: m["key"],
    message: cleanMessage,
    remoteJid: (m["key"] as Record<string, unknown>)["remoteJid"],
  });

  const type = Object.keys(cleanMessage as object)[0];
  if (!type) return;

  const mediaTypes = [
    "imageMessage",
    "videoMessage",
    "audioMessage",
    "stickerMessage",
    "documentMessage",
  ];
  if (!mediaTypes.includes(type)) return;

  try {
    const innerMsg = (cleanMessage as Record<string, unknown>)[type];
    const stream = await downloadContentFromMessage(
      innerMsg as Parameters<typeof downloadContentFromMessage>[0],
      type.replace("Message", "") as Parameters<typeof downloadContentFromMessage>[1]
    );
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    if (!buffer.length) return;

    const ext = getExtension(type, cleanMessage);
    const filePath = path.join(tempFolder, `${sessionId}_${keyId}${ext}`);
    await fs.promises.writeFile(filePath, buffer);
    mediaStore.set(keyId, filePath);

    setTimeout(() => {
      messageStore.delete(keyId);
      if (mediaStore.has(keyId)) {
        try {
          fs.unlinkSync(mediaStore.get(keyId)!);
        } catch {}
        mediaStore.delete(keyId);
      }
    }, CLEANUP_TIME);
  } catch (err: unknown) {
    const msg = (err as Error).message || "";
    const silentErrors = ["fetch failed", "Cannot derive", "Empty media key", "media key"];
    if (!silentErrors.some((e) => msg.includes(e))) {
      logger.warn({ err, sessionId }, "AntiDelete media download error");
    }
  }
}

export async function onDelete(
  conn: unknown,
  updates: unknown[],
  sessionId: string
): Promise<void> {
  const messageStore = getMessageStore(sessionId);
  const mediaStore = getMediaStore(sessionId);
  const sock = conn as Record<string, (jid: string, content: unknown, opts?: unknown) => Promise<void>>;

  for (const update of updates) {
    const u = update as Record<string, unknown>;
    const key = u["key"] as Record<string, unknown> | undefined;
    if (!key?.["id"]) continue;

    const isDelete =
      u["action"] === "delete" ||
      (u["update"] as Record<string, unknown>)?.["message"] === null;
    if (!isDelete) continue;

    const from = key["remoteJid"] as string;
    if (!isAntiDeleteEnabled(sessionId, from)) continue;

    const keyId = key["id"] as string;
    const stored = messageStore.get(keyId) as Record<string, unknown> | undefined;
    if (!stored) continue;

    const sender = (key["participant"] as string) || from;
    const caption = `🗑️ *AntiDelete — NIMSARA MD*\n\n👤 *Sender:* @${sender.replace("@s.whatsapp.net", "")}\n\n> Deleted message recovered by *NIMSARA MD* 🌟`;

    const cleanMsg = stored["message"] as Record<string, unknown>;
    const type = Object.keys(cleanMsg)[0];
    const innerMsg = cleanMsg[type!] as Record<string, unknown>;

    if (type === "conversation" || type === "extendedTextMessage") {
      const text =
        (innerMsg?.["text"] as string) || (cleanMsg["conversation"] as string) || "";
      await sock["sendMessage"](from, { text: `${caption}\n\n💬 *Message:*\n${text}` });
    } else if (mediaStore.has(keyId)) {
      const filePath = mediaStore.get(keyId)!;
      const buffer = fs.readFileSync(filePath);
      if (type === "imageMessage") {
        await sock["sendMessage"](from, { image: buffer, caption });
      } else if (type === "videoMessage") {
        await sock["sendMessage"](from, { video: buffer, caption });
      } else if (type === "audioMessage") {
        await sock["sendMessage"](from, { audio: buffer, mimetype: "audio/ogg; codecs=opus", ptt: true });
        await sock["sendMessage"](from, { text: caption });
      } else if (type === "stickerMessage") {
        await sock["sendMessage"](from, { sticker: buffer });
        await sock["sendMessage"](from, { text: caption });
      } else if (type === "documentMessage") {
        const fileName = (innerMsg?.["fileName"] as string) || "document";
        await sock["sendMessage"](from, { document: buffer, fileName, caption });
      }
    }
  }
}
