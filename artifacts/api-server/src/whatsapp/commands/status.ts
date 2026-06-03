import { cmd } from "../command.js";
import { downloadContentFromMessage } from "@whiskeysockets/baileys";

cmd(
  { pattern: "status", alias: ["savestat", "dlstatus", "savestatus"], react: "📥", desc: "Download/save a status update", category: "tools" },
  async (conn, msg, { from, sender, reply, quoted }) => {
    try {
      if (!quoted) return (reply as (t: string) => Promise<void>)(`📥 *Status Downloader — NIMSARA MD*\n\nStatus message එකකට reply කරලා *.status* ලෙස ටයිප් කරන්න.\n\n*Supports:* Image, Video, Audio\n\n> *NIMSARA MD* 🌟`);

      const sock = conn as Record<string, (jid: string, content: unknown, opts?: unknown) => Promise<void>>;
      const quotedMsg = quoted as Record<string, unknown>;
      let msgContent = quotedMsg["message"] as Record<string, unknown>;
      let type = Object.keys(msgContent)[0]!;
      let innerMsg = msgContent[type] as Record<string, unknown>;

      const wrappers = ["viewOnceMessageV2", "viewOnceMessage", "ephemeralMessage"];
      while (wrappers.includes(type)) {
        innerMsg = (innerMsg["message"] as Record<string, unknown>);
        type = Object.keys(innerMsg)[0]!;
      }

      const mediaTypes = ["imageMessage", "videoMessage", "audioMessage", "stickerMessage"];
      if (!mediaTypes.includes(type)) {
        const text = (innerMsg?.["text"] as string) || (msgContent["conversation"] as string) || ((msgContent["extendedTextMessage"] as Record<string, string>)?.["text"]);
        if (text) {
          await sock["sendMessage"](sender as string, { text: `📋 *Saved Status Text:*\n\n${text}\n\n> *NIMSARA MD* 🌟` });
          if (from !== sender) await sock["sendMessage"](from as string, { text: "✅ Status saved to your DM!\n> *NIMSARA MD*" }, { quoted: msg });
          return;
        }
        return (reply as (t: string) => Promise<void>)(`❌ Unsupported status type: ${type}`);
      }

      await (reply as (t: string) => Promise<void>)("⏳ Downloading status...");
      const stream = await downloadContentFromMessage(
        innerMsg as Parameters<typeof downloadContentFromMessage>[0],
        type.replace("Message", "") as Parameters<typeof downloadContentFromMessage>[1]
      );
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
      if (!buffer.length) return (reply as (t: string) => Promise<void>)("❌ Download failed. Media may have expired.");

      const caption = ((innerMsg["caption"] as string) || "") + "\n\n> 📥 *Saved via NIMSARA MD* 🌟";
      if (type === "imageMessage") await sock["sendMessage"](sender as string, { image: buffer, caption });
      else if (type === "videoMessage") await sock["sendMessage"](sender as string, { video: buffer, caption });
      else if (type === "audioMessage") {
        await sock["sendMessage"](sender as string, { audio: buffer, mimetype: "audio/mpeg", ptt: false });
        await sock["sendMessage"](sender as string, { text: caption });
      } else if (type === "stickerMessage") {
        await sock["sendMessage"](sender as string, { sticker: buffer });
        await sock["sendMessage"](sender as string, { text: "> 📥 *Saved via NIMSARA MD* 🌟" });
      }

      if (from !== sender) await sock["sendMessage"](from as string, { text: "✅ Status ඔබේ DM වලට save කළා! 📥\n> *NIMSARA MD*" }, { quoted: msg });
    } catch (err) {
      await (reply as (t: string) => Promise<void>)("❌ Status download failed: " + (err as Error).message);
    }
  }
);
