import { cmd } from "../command.js";
import { downloadContentFromMessage, type WAMessage } from "@whiskeysockets/baileys";

const OWNER_JID = (process.env["OWNER_NUMBER"] || "94726280182") + "@s.whatsapp.net";

type Conn = {
  sendMessage: (jid: string, content: unknown, opts?: unknown) => Promise<unknown>;
  updateMediaMessage: (msg: WAMessage) => Promise<WAMessage>;
};

async function downloadMedia(
  conn: Conn,
  rawMsg: WAMessage,
  inner: Record<string, unknown>,
  mediaType: string
): Promise<Buffer> {
  let media = inner;
  try {
    const updated = await conn.updateMediaMessage(rawMsg);
    const updMsg = updated.message as Record<string, unknown>;
    let uType = Object.keys(updMsg)[0]!;
    let uInner = updMsg[uType] as Record<string, unknown>;
    if (
      uType === "viewOnceMessage" ||
      uType === "viewOnceMessageV2" ||
      uType === "viewOnceMessageV2Extension" ||
      uType === "ephemeralMessage"
    ) {
      const nested = uInner["message"] as Record<string, unknown>;
      uType = Object.keys(nested)[0]!;
      uInner = nested[uType] as Record<string, unknown>;
    }
    media = uInner;
  } catch {
    // use original inner
  }

  const stream = await downloadContentFromMessage(
    media as Parameters<typeof downloadContentFromMessage>[0],
    mediaType.replace("Message", "") as Parameters<typeof downloadContentFromMessage>[1]
  );
  let buf = Buffer.from([]);
  for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
  return buf;
}

cmd(
  { pattern: "vv", alias: ["viewonce", "retrieve", "❤️"], react: "👁️", desc: "Retrieve View Once message", category: "tools" },
  async (conn, msg, { from, reply, quoted, rawMsg, ownerOnly }) => {
    try {
      const sock = conn as unknown as Conn;
      const currentWAMsg = (rawMsg as WAMessage | undefined) ?? (msg as unknown as WAMessage);
      const sendTo = ownerOnly ? OWNER_JID : (from as string);

      async function sendMedia(type: string, buffer: Buffer, caption: string) {
        if (type === "imageMessage") await sock.sendMessage(sendTo, { image: buffer, caption }, ownerOnly ? undefined : { quoted: msg });
        else if (type === "videoMessage") await sock.sendMessage(sendTo, { video: buffer, caption }, ownerOnly ? undefined : { quoted: msg });
        else if (type === "audioMessage") await sock.sendMessage(sendTo, { audio: buffer, mimetype: "audio/mpeg", ptt: false }, ownerOnly ? undefined : { quoted: msg });

        // If sent to chat and not owner's chat, also copy to owner DM
        if (!ownerOnly && sendTo !== OWNER_JID) {
          const label = `👁️ *VV Retrieved*\n💬 *Chat:* ${from}\n\n> *NIMSARA MD* 🌟`;
          if (type === "imageMessage") await sock.sendMessage(OWNER_JID, { image: buffer, caption: label });
          else if (type === "videoMessage") await sock.sendMessage(OWNER_JID, { video: buffer, caption: label });
          else if (type === "audioMessage") {
            await sock.sendMessage(OWNER_JID, { audio: buffer, mimetype: "audio/mpeg", ptt: false });
            await sock.sendMessage(OWNER_JID, { text: label });
          }
        }
      }

      // --- Case 1: current message IS a view-once ---
      const currentMsgContent = currentWAMsg.message as Record<string, unknown> | null;
      if (currentMsgContent) {
        const topType = Object.keys(currentMsgContent)[0]!;
        if (
          topType === "viewOnceMessage" ||
          topType === "viewOnceMessageV2" ||
          topType === "viewOnceMessageV2Extension"
        ) {
          const innerMsg = (currentMsgContent[topType] as Record<string, unknown>)["message"] as Record<string, unknown>;
          const mediaType = Object.keys(innerMsg)[0]!;
          const inner = innerMsg[mediaType] as Record<string, unknown>;

          if (!["imageMessage", "videoMessage", "audioMessage"].includes(mediaType)) {
            if (!ownerOnly) await (reply as (t: string) => Promise<void>)("❌ Unsupported media type.");
            return;
          }

          const buffer = await downloadMedia(sock, currentWAMsg, inner, mediaType);
          if (!buffer.length) {
            if (!ownerOnly) await (reply as (t: string) => Promise<void>)("❌ Media download failed.");
            return;
          }

          const caption = (inner["caption"] as string) || "";
          await sendMedia(mediaType, buffer, caption);
          return;
        }
      }

      // --- Case 2: quoted is a view-once ---
      if (!quoted) return;

      const quotedMsg = quoted as Record<string, unknown>;
      let msgContent = quotedMsg["message"] as Record<string, unknown>;
      if (!msgContent) return;

      let type = Object.keys(msgContent)[0]!;
      let innerMsg = msgContent[type] as Record<string, unknown>;

      if (type === "viewOnceMessageV2" || type === "viewOnceMessage" || type === "viewOnceMessageV2Extension") {
        innerMsg = innerMsg["message"] as Record<string, unknown>;
        type = Object.keys(innerMsg)[0]!;
        innerMsg = innerMsg[type] as Record<string, unknown>;
      }
      if (type === "ephemeralMessage") {
        innerMsg = innerMsg["message"] as Record<string, unknown>;
        type = Object.keys(innerMsg)[0]!;
        innerMsg = innerMsg[type] as Record<string, unknown>;
      }

      if (!["imageMessage", "videoMessage", "audioMessage"].includes(type)) return;

      const fakeMsg = {
        key: (quotedMsg["key"] as WAMessage["key"]) || currentWAMsg.key,
        message: { [type]: innerMsg },
      } as unknown as WAMessage;

      const buffer = await downloadMedia(sock, fakeMsg, innerMsg, type);
      if (!buffer.length) return;

      const caption = (innerMsg["caption"] as string) || "";
      await sendMedia(type, buffer, caption);

    } catch (err) {
      await (reply as (t: string) => Promise<void>)("❌ Failed: " + (err as Error).message);
    }
  }
);
