import { cmd } from "../command.js";
import type makeWASocket from "@whiskeysockets/baileys";

type Conn = ReturnType<typeof makeWASocket>;

cmd(
  { pattern: "getpp", alias: ["profilepic", "pp"], react: "🖼️", desc: "Get profile picture by phone number", category: "owner" },
  async (conn, msg, { from, reply, args, quoted }) => {
    try {
      const sock = conn as unknown as Conn;

      let input: string | undefined =
        (args as string[]).join("").trim() ||
        ((quoted as Record<string, unknown> | null)?.["sender"] as string | undefined);

      if (!input) {
        return (reply as (t: string) => Promise<void>)(
          `🖼️ *GetPP — NIMSARA MD*\n\nPhone number denna!\nExample: \`getpp 947XXXXXXXX\`\n\n> *NIMSARA MD* 🌟`
        );
      }

      const cleanNumber = input.replace(/[^0-9]/g, "");

      if (cleanNumber.length < 5 || cleanNumber.length > 15) {
        return (reply as (t: string) => Promise<void>)("❌ Invalid phone number!");
      }

      const targetJid = cleanNumber + "@s.whatsapp.net";

      let ppUrl: string;
      try {
        ppUrl = await sock.profilePictureUrl(targetJid, "image");
      } catch {
        return (reply as (t: string) => Promise<void>)(
          "🖼️ User has no profile picture or privacy restricted!"
        );
      }

      await sock.sendMessage(
        from as string,
        {
          image: { url: ppUrl },
          caption: `✅ *GETPP SUCCESS*\n\n👤 *Number:* +${cleanNumber}\n\n> *NIMSARA MD* 🌟`,
        },
        { quoted: msg as never }
      );
    } catch (err) {
      await (reply as (t: string) => Promise<void>)("🛑 Error: " + (err as Error).message);
    }
  }
);
