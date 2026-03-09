const express = require("express");
const { authRequired } = require("../middleware/auth");
const { getOrgSettings } = require("../services/org.service");
const { getTenantById } = require("../services/users.service");
const { buildUserGuidePdf } = require("../services/pdf.service");

const router = express.Router();

router.get("/user-guide.pdf", authRequired, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const tenant = getTenantById(tenantId);
  const settings = getOrgSettings({ tenantId });
  const pdf = await buildUserGuidePdf({
    tenantName: tenant ? tenant.name : null,
    support: settings
  });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=\"guide_utilisateur.pdf\"");
  return res.send(pdf);
});

module.exports = router;
