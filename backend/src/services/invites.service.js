const crypto = require("crypto");
const { withDb, loadDb } = require("./store.service");
const { createUser } = require("./users.service");

function createInvite({
  tenantId,
  email,
  role = "user",
  expiresHours = 72,
  createdBy
}) {
  return withDb((db) => {
    const exists = db.users.find(
      (u) => u.tenant_id === tenantId && u.email.toLowerCase() === email.toLowerCase()
    );
    if (exists) {
      return { error: "email_exists" };
    }
    const token = crypto.randomBytes(24).toString("hex");
    const invite = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      email,
      role,
      token,
      status: "pending",
      created_by: createdBy || null,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + expiresHours * 3600 * 1000).toISOString(),
      accepted_at: null,
      revoked_at: null
    };
    db.invites = db.invites || [];
    db.invites.push(invite);
    return { invite };
  });
}

function listInvites({ tenantId }) {
  const db = loadDb();
  return (db.invites || [])
    .filter((invite) => invite.tenant_id === tenantId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      token: invite.token,
      status: invite.status,
      created_at: invite.created_at,
      expires_at: invite.expires_at,
      accepted_at: invite.accepted_at
    }));
}

function revokeInvite({ tenantId, inviteId }) {
  return withDb((db) => {
    const invite = (db.invites || []).find(
      (item) => item.id === inviteId && item.tenant_id === tenantId
    );
    if (!invite) return null;
    invite.status = "revoked";
    invite.revoked_at = new Date().toISOString();
    return invite;
  });
}

function acceptInvite({ token, password }) {
  const db = loadDb();
  const invite = (db.invites || []).find((item) => item.token === token);
  if (!invite) {
    return { error: "invalid_token" };
  }
  if (invite.status !== "pending") {
    return { error: "invite_not_active" };
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { error: "invite_expired" };
  }

  const result = createUser({
    tenantId: invite.tenant_id,
    email: invite.email,
    password,
    role: invite.role
  });
  if (result.error) {
    return result;
  }

  withDb((dbInner) => {
    const stored = (dbInner.invites || []).find((item) => item.id === invite.id);
    if (stored) {
      stored.status = "accepted";
      stored.accepted_at = new Date().toISOString();
    }
  });

  return { user: result.user, invite };
}

module.exports = { createInvite, listInvites, revokeInvite, acceptInvite };
