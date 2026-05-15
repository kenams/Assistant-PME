const express = require("express");
const fs = require("fs");
const path = require("path");
const { authRequired } = require("../middleware/auth");
const { db } = require("../config/db");

const router = express.Router();

const IMAGE_PREFIX = "__IMAGE__:";
const uploadDir = path.join(process.cwd(), "data", "uploads");

const MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml"
};

function normalizeUploadPath(filename) {
  const raw = String(filename || "").trim();
  const safe = path.basename(raw);
  if (!safe || safe !== raw) {
    return null;
  }
  return `/uploads/${safe}`;
}

async function canAccessUpload({ tenantId, userId, role, uploadPath }) {
  const linkedMessages = await db("messages")
    .where({ tenant_id: tenantId, content: `${IMAGE_PREFIX}${uploadPath}` });

  if (role !== "user") {
    if (linkedMessages.length) return true;
    const ticket = await db("tickets")
      .where({ tenant_id: tenantId })
      .whereILike("description", `%${uploadPath}%`)
      .first();
    return Boolean(ticket);
  }

  for (const msg of linkedMessages) {
    const owns = await db("conversations")
      .where({ tenant_id: tenantId, id: msg.conversation_id, user_id: userId })
      .first();
    if (owns) return true;
  }

  const tickets = await db("tickets")
    .where({ tenant_id: tenantId })
    .whereILike("description", `%${uploadPath}%`);
  for (const ticket of tickets) {
    if (!ticket.conversation_id) continue;
    const owns = await db("conversations")
      .where({ tenant_id: tenantId, id: ticket.conversation_id, user_id: userId })
      .first();
    if (owns) return true;
  }

  return false;
}

router.get("/:filename", authRequired, async (req, res, next) => {
  try {
    const uploadPath = normalizeUploadPath(req.params.filename);
    if (!uploadPath) {
      return res.status(400).json({ error: "invalid_file" });
    }

    const tenantId = req.user.tenant_id;
    const userId = req.user.sub;
    const role = req.user.role || "user";

    const canAccess = await canAccessUpload({ tenantId, userId, role, uploadPath });
    if (!canAccess) {
      return res.status(404).json({ error: "file_not_found" });
    }

    const fullPath = path.join(uploadDir, path.basename(uploadPath));
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "file_not_found" });
    }

    const ext = path.extname(fullPath).toLowerCase();
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
    return res.sendFile(fullPath);
  } catch (err) { next(err); }
});

module.exports = router;
