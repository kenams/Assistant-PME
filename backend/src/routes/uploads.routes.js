const express = require("express");
const fs = require("fs");
const path = require("path");
const { authRequired } = require("../middleware/auth");
const { loadDb } = require("../services/store.service");

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

function userOwnsConversation(db, tenantId, userId, conversationId) {
  return db.conversations.some(
    (conversation) =>
      conversation.tenant_id === tenantId &&
      conversation.id === conversationId &&
      conversation.user_id === userId
  );
}

function canAccessUpload({ db, tenantId, userId, role, uploadPath }) {
  const linkedMessages = (db.messages || []).filter(
    (message) =>
      message.tenant_id === tenantId && message.content === `${IMAGE_PREFIX}${uploadPath}`
  );

  if (role !== "user") {
    if (linkedMessages.length) {
      return true;
    }
    return (db.tickets || []).some(
      (ticket) =>
        ticket.tenant_id === tenantId &&
        String(ticket.description || "").includes(uploadPath)
    );
  }

  if (
    linkedMessages.some((message) =>
      userOwnsConversation(db, tenantId, userId, message.conversation_id)
    )
  ) {
    return true;
  }

  return (db.tickets || []).some(
    (ticket) =>
      ticket.tenant_id === tenantId &&
      String(ticket.description || "").includes(uploadPath) &&
      userOwnsConversation(db, tenantId, userId, ticket.conversation_id)
  );
}

router.get("/:filename", authRequired, (req, res) => {
  const uploadPath = normalizeUploadPath(req.params.filename);
  if (!uploadPath) {
    return res.status(400).json({ error: "invalid_file" });
  }

  const db = loadDb();
  const tenantId = req.user.tenant_id;
  const userId = req.user.sub;
  const role = req.user.role || "user";

  if (!canAccessUpload({ db, tenantId, userId, role, uploadPath })) {
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
});

module.exports = router;
