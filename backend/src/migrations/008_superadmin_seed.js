exports.up = async function (knex) {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@assistant.local";
  await knex("users")
    .whereRaw("LOWER(email) = ?", [email.toLowerCase()])
    .update({ role: "superadmin" });
};

exports.down = async function (knex) {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@assistant.local";
  await knex("users")
    .whereRaw("LOWER(email) = ?", [email.toLowerCase()])
    .update({ role: "admin" });
};
