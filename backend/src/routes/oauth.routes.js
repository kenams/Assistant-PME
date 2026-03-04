const express = require("express");
const { authRequired } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/roles");
const { buildAuthorizationUrl, exchangeCode, getProviderConfig } = require("../services/oauth.service");
const { getDefaultTenantId } = require("../services/tenants.service");

const router = express.Router();

router.get("/:provider/url", authRequired, requireAdmin, (req, res) => {
  const provider = req.params.provider;
  if (!getProviderConfig(provider)) {
    return res.status(404).json({ error: "provider_not_supported" });
  }
  const tenantId = req.user.tenant_id;
  const result = buildAuthorizationUrl({ provider, tenantId });
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  return res.json({ url: result.url });
});

router.get("/:provider/callback", async (req, res) => {
  const provider = req.params.provider;
  if (!getProviderConfig(provider)) {
    return res.status(404).send("Provider not supported");
  }
  const tenantId = getDefaultTenantId();
  if (!tenantId) {
    return res.status(500).send("Tenant not found");
  }
  const { code, state } = req.query || {};
  if (!code) {
    return res.status(400).send("Missing code");
  }
  const result = await exchangeCode({
    provider,
    tenantId,
    code: String(code),
    state: String(state || "")
  });
  if (result.error) {
    return res
      .status(400)
      .send(`OAuth error: ${result.error}. Vous pouvez fermer cette page.`);
  }
  return res.send(
    `<html><body style="font-family: sans-serif;">
      <h3>Connexion ${provider} reussie.</h3>
      <p>Vous pouvez revenir sur l'application.</p>
      <a href="/app/">Retourner a l'app</a>
    </body></html>`
  );
});

module.exports = router;
