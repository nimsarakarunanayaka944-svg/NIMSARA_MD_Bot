import { cmd, PREFIX } from "../command.js";

cmd(
  { pattern: "alive", alias: ["ping", "online"], desc: "Check if bot is online", category: "main", react: "👋" },
  async (conn, msg, { from, pushname, reply }) => {
    try {
      const used = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
      const total = (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2);
      const uptime = formatUptime(process.uptime());

      const text = `👋 *Hello ${(pushname as string) || "Friend"}! I'm alive!*

*╔══════════════════╗*
*║   NIMSARA  MD   ║*
*╚══════════════════╝*

| 🤖 *Bot:* NIMSARA MD
| 📦 *Version:* 1.0.0
| ⚡ *Status:* Online ✅
| 🧠 *Memory:* ${used}MB / ${total}MB
| ⏱️ *Uptime:* ${uptime}

*මෙනුව ලබා ගැනීමට* *${PREFIX}menu* ලෙස ටයිප් කරන්න
*Owner සම්බන්ධ වීමට* *${PREFIX}owner* ටයිප් කරන්න

> © *POWERED BY NIMSARA MD* 🌟`;

      const sock = conn as Record<string, (jid: string, content: unknown, opts?: unknown) => Promise<void>>;
      const ALIVE_IMG = process.env["ALIVE_IMG"];
      if (ALIVE_IMG) {
        await sock["sendMessage"](from as string, { image: { url: ALIVE_IMG }, caption: text }, { quoted: msg });
      } else {
        await sock["sendMessage"](from as string, { text }, { quoted: msg });
      }
    } catch (e) {
      await (reply as (t: string) => Promise<void>)("❌ Error: " + (e as Error).message);
    }
  }
);

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}
