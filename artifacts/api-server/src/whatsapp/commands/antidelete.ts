import { cmd } from "../command.js";
import { loadState, saveState } from "../antidelete.js";

cmd(
  { pattern: "antidelete", alias: ["antidel"], desc: "AntiDelete on/off කිරීම", category: "group", react: "🗑️" },
  async (_conn, _msg, { from, args, isOwner, reply, sessionId }) => {
    const subCmd = (args as string[])[0]?.toLowerCase();

    if (!subCmd || (subCmd !== "on" && subCmd !== "off")) {
      const state = loadState(sessionId as string);
      const current = state[from as string] === true ? "✅ ON" : "❌ OFF";
      return (reply as (t: string) => Promise<void>)(
        `🗑️ *AntiDelete — NIMSARA MD*\n\nCurrent status: *${current}*\n\nUsage:\n*.antidelete on* — enable\n*.antidelete off* — disable\n\n> *NIMSARA MD* 🌟`
      );
    }

    if (!isOwner) {
      return (reply as (t: string) => Promise<void>)("❌ Only the owner can change antidelete settings.");
    }

    const state = loadState(sessionId as string);
    state[from as string] = subCmd === "on";
    saveState(sessionId as string, state);

    await (reply as (t: string) => Promise<void>)(
      subCmd === "on"
        ? "✅ *AntiDelete enabled!* Deleted messages will be recovered.\n\n> *NIMSARA MD* 🌟"
        : "❌ *AntiDelete disabled.*\n\n> *NIMSARA MD* 🌟"
    );
  }
);
