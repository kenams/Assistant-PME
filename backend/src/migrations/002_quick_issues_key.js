exports.up = async function (knex) {
  await knex.schema.alterTable("quick_issues", (t) => {
    t.text("key").nullable();
    t.timestamp("last_seen").nullable();
  });
  await knex.schema.raw("CREATE INDEX idx_quick_issues_key ON quick_issues(tenant_id, key)");
};

exports.down = async function (knex) {
  await knex.schema.alterTable("quick_issues", (t) => {
    t.dropColumn("key");
    t.dropColumn("last_seen");
  });
};
