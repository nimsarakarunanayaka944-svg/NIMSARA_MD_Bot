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

// Decodes the base64 data URL and serves an actual PNG image,
// so it can be opened directly in a browser (or used in an <img> tag).
router.get("/whatsapp/qr.png", (_req, res) => {
  const qrData = getBotQr();

  if (!qrData.qr) {
    res
      .status(404)
      .send(qrData.connected ? "Already connected — no QR code." : "QR code not generated yet.");
    return;
  }

  const base64 = qrData.qr.split(",")[1] ?? qrData.qr;
  const buffer = Buffer.from(base64, "base64");

  res.set("Content-Type", "image/png");
  res.set("Cache-Control", "no-store");
  res.send(buffer);
});

export default router;
