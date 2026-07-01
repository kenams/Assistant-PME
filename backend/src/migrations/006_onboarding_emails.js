exports.up = async function (knex) {
  await knex.schema.alterTable("tenants", (t) => {
    t.timestamp("onboarding_j0_sent_at").nullable();
    t.timestamp("onboarding_j3_sent_at").nullable();
    t.timestamp("onboarding_j7_sent_at").nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("tenants", (t) => {
    t.dropColumn("onboarding_j0_sent_at");
    t.dropColumn("onboarding_j3_sent_at");
    t.dropColumn("onboarding_j7_sent_at");
  });
};
