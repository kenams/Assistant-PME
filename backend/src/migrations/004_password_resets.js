exports.up = async function (knex) {
  await knex.schema.createTable("password_resets", (t) => {
    t.uuid("id").primary();
    t.uuid("user_id").notNullable();
    t.text("token").notNullable().unique();
    t.boolean("used").defaultTo(false);
    t.timestamp("created_at").defaultTo(knex.fn.now());
    t.timestamp("expires_at").notNullable();
  });
  await knex.schema.raw("CREATE INDEX idx_password_resets_token ON password_resets(token)");
  await knex.schema.raw("CREATE INDEX idx_password_resets_user ON password_resets(user_id)");
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("password_resets");
};
