const crypto = require("crypto");
const { db } = require("../config/db");
const { createUser } = require("./users.service");

async function createInvite({ tenantId, email, role = "user", expiresHours = 72, createdBy }) {
  const exists = await db("users")
    .where({ tenant_id: tenantId })
    .whereRaw("LOWER(email) = ?", [email.toLowerCase()])
    .first();
  if (exists) {
    return { error: "email_exists" };
  }

  const token = crypto.randomBytes(24).toString("hex");
  const now = new Date().toISOString();
  const [invite] = await db("invites").insert({
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    email,
    role,
    token,
    status: "pending",
    created_by: createdBy || null,
    created_at: now,
    expires_at: new Date(Date.now() + expiresHours * 3600 * 1000).toISOString(),
    accepted_at: null,
    revoked_at: null
  }).returning("*");

  return { invite };
}

async function listInvites({ tenantId }) {
  return db("invites")
    .where({ tenant_id: tenantId })
    .orderBy("created_at", "desc")
    .select("id", "email", "role", "token", "status", "created_at", "expires_at", "accepted_at");
}

async function revokeInvite({ tenantId, inviteId }) {
  const [updated] = await db("invites")
    .where({ id: inviteId, tenant_id: tenantId })
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .returning("*");
  return updated || null;
}

async function acceptInvite({ token, password }) {
  const invite = await db("invites").where({ token }).first();
  if (!invite) {
    return { error: "invalid_token" };
  }
  if (invite.status !== "pending") {
    return { error: "invite_not_active" };
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { error: "invite_expired" };
  }

  const result = await createUser({
    tenantId: invite.tenant_id,
    email: invite.email,
    password,
    role: invite.role
  });
  if (result.error) {
    return result;
  }

  await db("invites").where({ id: invite.id }).update({
    status: "accepted",
    accepted_at: new Date().toISOString()
  });

  return { user: result.user, invite };
}

module.exports = { createInvite, listInvites, revokeInvite, acceptInvite };
