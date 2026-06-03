import { cmd, getCommands, PREFIX } from "../command.js";

cmd(
  { pattern: "menu", alias: ["help", "commands"], desc: "Show all commands", category: "main", react: "📋" },
  async (conn, msg, { from, pushname, reply }) => {
    try {
      const allCmds = getCommands();
      const categories: Record<string, string[]> = {};
      for (const c of allCmds) {
        const cat = c.category || "other";
        if (!categories[cat]) categories[cat] = [];
        categories[cat]!.push(c.pattern);
      }

      const icons: Record<string, string> = { main: "🏠", group: "👥", tools: "🔧", utility: "📦", other: "⚙️" };
      let menuText = `╔══════════════════╗\n║    NIMSARA  MD   ║\n╚══════════════════╝\n\n👋 *Hello ${(pushname as string) || "Friend"}!*\n📋 *Available Commands*\n\n`;

      for (const [cat, cmds] of Object.entries(categories)) {
        const icon = icons[cat] || "⚙️";
        menuText += `*${icon} ${cat.toUpperCase()}*\n`;
        for (const c of cmds) menuText += `  ┣ *${PREFIX}${c}*\n`;
        menuText += "\n";
      }
      menuText += `> © *POWERED BY NIMSARA MD* 🌟`;

      const sock = conn as Record<string, (jid: string, content: unknown, opts?: unknown) => Promise<void>>;
      const ALIVE_IMG = process.env["ALIVE_IMG"];
      if (ALIVE_IMG) {
        await sock["sendMessage"](from as string, { image: { url: ALIVE_IMG }, caption: menuText }, { quoted: msg });
      } else {
        await sock["sendMessage"](from as string, { text: menuText }, { quoted: msg });
      }
    } catch (e) {
      await (reply as (t: string) => Promise<void>)("❌ " + (e as Error).message);
    }
  }
);
