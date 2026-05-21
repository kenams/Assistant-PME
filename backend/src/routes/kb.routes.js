const express = require("express");
const { z } = require("zod");
const multer = require("multer");
const { authRequired } = require("../middleware/auth");
const { requireStaff } = require("../middleware/roles");
const {
  ingestDocument,
  searchKb,
  listDocuments,
  deleteDocument,
  updateDocument
} = require("../services/rag.service");
const { validateOr400 } = require("../utils/validate");
const { extractTextFromFile } = require("../utils/file-text");
const { logEvent } = require("../services/audit.service");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const docSchema = z.object({
  title: z.string().min(1),
  source_type: z.enum(["pdf", "faq", "procedure", "note"]),
  source_url: z.string().url().optional(),
  content: z.string().min(1)
});

router.post("/documents", authRequired, requireStaff, async (req, res, next) => {
  try {
    const payload = validateOr400(docSchema, res, req.body);
    if (!payload) {
      return;
    }

    const tenantId = req.user.tenant_id;
    const doc = await ingestDocument({
      tenantId,
      title: payload.title,
      sourceType: payload.source_type,
      sourceUrl: payload.source_url,
      content: payload.content
    });

    await logEvent({
      tenantId,
      userId: req.user.sub,
      action: "kb_document_created",
      meta: { document_id: doc.id, title: doc.title }
    });

    return res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/upload",
  authRequired,
  requireStaff,
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "files", maxCount: 10 }
  ]),
  async (req, res, next) => {
    try {
      const files = [];
      if (req.files && req.files.files) {
        files.push(...req.files.files);
      }
      if (req.files && req.files.file) {
        files.push(...req.files.file);
      }

      if (!files.length) {
        return res.status(400).json({ error: "missing_file" });
      }

      const title = req.body && req.body.title ? req.body.title : null;
      const sourceType =
        req.body && req.body.source_type ? req.body.source_type : "file";

      const tenantId = req.user.tenant_id;
      const items = [];

      for (const file of files) {
        const content = await extractTextFromFile(file);
        if (!content || !content.trim()) {
          continue;
        }
        const doc = await ingestDocument({
          tenantId,
          title: title || file.originalname,
          sourceType,
          sourceUrl: file.originalname,
          content
        });
        items.push(doc);
      }

      if (!items.length) {
        return res.status(400).json({ error: "empty_content" });
      }

      await logEvent({
        tenantId,
        userId: req.user.sub,
        action: "kb_files_uploaded",
        meta: { count: items.length }
      });

      return res.status(201).json({ items, count: items.length });
    } catch (err) {
      next(err);
    }
  }
);

router.post("/search", authRequired, async (req, res, next) => {
  try {
    const query = (req.body && req.body.query) || "";
    const tenantId = req.user.tenant_id;
    const items = await searchKb({ tenantId, query });
    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.get("/documents", authRequired, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const items = await listDocuments({ tenantId });
    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.get("/documents/:id", authRequired, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { db } = require("../config/db");
    const doc = await db("kb_documents").where({ id: req.params.id, tenant_id: tenantId }).first();
    if (!doc) return res.status(404).json({ error: "document_not_found" });
    const chunks = await db("kb_chunks").where({ document_id: doc.id });
    return res.json({ ...doc, content: chunks.map(c => c.chunk_text).join("\n\n"), chunk_count: chunks.length });
  } catch (err) { next(err); }
});

router.put("/documents/:id", authRequired, requireStaff, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { title, source_type, content } = req.body || {};
    if (!content || !content.trim()) return res.status(400).json({ error: "missing_content" });
    const updated = await updateDocument({ tenantId, documentId: req.params.id, title, sourceType: source_type, content });
    if (!updated) return res.status(404).json({ error: "document_not_found" });
    await logEvent({ tenantId, userId: req.user.sub, action: "kb_document_updated", meta: { document_id: req.params.id } });
    return res.json(updated);
  } catch (err) { next(err); }
});

router.delete("/documents/:id", authRequired, requireStaff, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const ok = await deleteDocument({ tenantId, documentId: req.params.id });
    if (!ok) {
      return res.status(404).json({ error: "document_not_found" });
    }
    await logEvent({
      tenantId,
      userId: req.user.sub,
      action: "kb_document_deleted",
      meta: { document_id: req.params.id }
    });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
