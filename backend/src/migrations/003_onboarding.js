exports.up = async function (knex) {
  await knex.schema.createTable("onboarding_tokens", (t) => {
    t.uuid("id").primary();
    t.text("session_id").notNullable().unique();
    t.text("email").notNullable();
    t.text("tenant_name").notNullable();
    t.text("tenant_id").notNullable();
    t.text("temp_password").notNullable();
    t.boolean("used").defaultTo(false);
    t.timestamp("created_at").defaultTo(knex.fn.now());
    t.timestamp("expires_at").notNullable();
  });
  await knex.schema.raw("CREATE INDEX idx_onboarding_tokens_session ON onboarding_tokens(session_id)");
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("onboarding_tokens");
};
