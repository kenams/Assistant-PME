exports.up = async function (knex) {
  await knex.schema.alterTable("users", (t) => {
    t.boolean("must_change_password").defaultTo(false);
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("users", (t) => {
    t.dropColumn("must_change_password");
  });
};
