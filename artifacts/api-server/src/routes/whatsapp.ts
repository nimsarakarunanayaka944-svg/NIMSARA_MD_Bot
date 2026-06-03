import { Router, type IRouter } from "express";
import { getBotStatus, getBotQr } from "../whatsapp/bot.js";

const router: IRouter = Router();

router.get("/whatsapp/status", (_req, res) => {
  const status = getBotStatus();
  res.json({
    connected: status.connected,
    user: status.user ? String(status.user.id) : null,
  });
});

router.get("/whatsapp/qr", (_req, res) => {
  const qrData = getBotQr();
  res.json({
    qr: qrData.qr,
    connected: qrData.connected,
  });
});

export default router;
