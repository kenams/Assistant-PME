exports.up = async function (knex) {
  await knex.schema.alterTable("users", (t) => {
    t.boolean("active").defaultTo(true).notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("users", (t) => {
    t.dropColumn("active");
  });
};
