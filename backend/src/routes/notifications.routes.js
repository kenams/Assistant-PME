const express = require("express");
const { authRequired } = require("../middleware/auth");
const { requireStaff } = require("../middleware/roles");
const { createNotification, listNotifications } = require("../services/notifications.service");

const router = express.Router();

router.get("/", authRequired, requireStaff, (req, res) => {
  const tenantId = req.user.tenant_id;
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  const items = listNotifications({ tenantId, limit });
  return res.json({ items });
});

router.post("/test", authRequired, requireStaff, (req, res) => {
  const tenantId = req.user.tenant_id;
  const notification = createNotification({
    tenantId,
    userId: req.user.sub,
    type: "test",
    channel: "email_simulated",
    payload: {
      subject: "Test notification",
      body: "Ceci est un test de notification."
    }
  });
  return res.status(201).json(notification);
});

router.post("/webhook-local", authRequired, requireStaff, (req, res) => {
  const tenantId = req.user.tenant_id;
  const notification = createNotification({
    tenantId,
    userId: req.user.sub,
    type: "webhook_test",
    channel: "webhook_local",
    payload: req.body || {}
  });
  return res.status(201).json(notification);
});

module.exports = router;
