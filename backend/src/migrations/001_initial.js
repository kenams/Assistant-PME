exports.up = async function (knex) {
  await knex.schema
    .createTable("tenants", (t) => {
      t.uuid("id").primary();
      t.text("name").notNullable();
      t.text("code").notNullable().unique();
      t.text("plan").defaultTo("starter");
      t.text("stripe_customer_id").nullable();
      t.text("stripe_subscription_id").nullable();
      t.text("subscription_plan").nullable();
      t.text("subscription_status").nullable();
      t.timestamp("subscription_period_end").nullable();
      t.timestamp("subscription_updated_at").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at");
    })
    .createTable("users", (t) => {
      t.uuid("id").primary();
      t.uuid("tenant_id").references("id").inTable("tenants");
      t.text("email").notNullable();
      t.text("password_hash").notNullable();
      t.text("role").defaultTo("user");
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at");
      t.unique(["tenant_id", "email"]);
    })
    .createTable("conversations", (t) => {
      t.uuid("id").primary();
      t.uuid("tenant_id").references("id").inTable("tenants");
      t.uuid("user_id").references("id").inTable("users");
      t.text("status").defaultTo("open");
      t.integer("failure_count").defaultTo(0);
      t.jsonb("context");
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());
    })
    .createTable("messages", (t) => {
      t.uuid("id").primary();
      t.uuid("tenant_id").references("id").inTable("tenants");
      t.uuid("conversation_id").references("id").inTable("conversations");
      t.text("role").notNullable();
      t.text("content").notNullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
    })
    .createTable("tickets", (t) => {
      t.uuid("id").primary();
      t.uuid("tenant_id").references("id").inTable("tenants");
      t.uuid("conversation_id").references("id").inTable("conversations").nullable();
      t.uuid("user_id").nullable();
      t.text("external_id").nullable();
      t.text("external_url").nullable();
      t.text("title").notNullable();
      t.text("description");
      t.text("category").defaultTo("general");
      t.text("priority").defaultTo("medium");
      t.text("status").defaultTo("open");
      t.text("ai_suggestion").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());
    })
    .createTable("kb_documents", (t) => {
      t.uuid("id").primary();
      t.uuid("tenant_id").references("id").inTable("tenants");
      t.text("title").notNullable();
      t.text("source_type");
      t.text("source_url");
      t.timestamp("created_at").defaultTo(knex.fn.now());
    })
    .createTable("kb_chunks", (t) => {
      t.uuid("id").primary();
      t.uuid("tenant_id").references("id").inTable("tenants");
      t.uuid("document_id").references("id").inTable("kb_documents").onDelete("CASCADE");
      t.text("chunk_text").notNullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
    })
    .createTable("audit_logs", (t) => {
      t.uuid("id").primary();
      t.uuid("tenant_id").references("id").inTable("tenants");
      t.uuid("user_id").nullable();
      t.text("action").notNullable();
      t.jsonb("meta");
      t.timestamp("created_at").defaultTo(knex.fn.now());
    })
    .createTable("notifications", (t) => {
      t.uuid("id").primary();
      t.uuid("tenant_id").references("id").inTable("tenants");
      t.uuid("user_id").nullable();
      t.text("type").notNullable();
      t.text("channel").notNullable();
      t.jsonb("payload");
      t.boolean("read").defaultTo(false);
      t.timestamp("created_at").defaultTo(knex.fn.now());
    })
    .createTable("conversation_feedback", (t) => {
      t.uuid("id").primary();
      t.uuid("tenant_id").references("id").inTable("tenants");
      t.uuid("conversation_id").references("id").inTable("conversations");
      t.uuid("user_id").nullable();
      t.boolean("resolved").defaultTo(false);
      t.integer("rating").nullable();
      t.text("comment").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
    })
    .createTable("org_settings", (t) => {
      t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      t.uuid("tenant_id").references("id").inTable("tenants").unique();
      t.jsonb("settings").notNullable().defaultTo("{}");
      t.timestamp("updated_at").defaultTo(knex.fn.now());
    })
    .createTable("invites", (t) => {
      t.uuid("id").primary();
      t.uuid("tenant_id").references("id").inTable("tenants");
      t.text("email").notNullable();
      t.text("role").defaultTo("user");
      t.text("token").notNullable().unique();
      t.text("status").defaultTo("pending");
      t.uuid("created_by").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("expires_at");
      t.timestamp("accepted_at").nullable();
      t.timestamp("revoked_at").nullable();
    })
    .createTable("leads", (t) => {
      t.uuid("id").primary();
      t.uuid("tenant_id").references("id").inTable("tenants");
      t.text("name").nullable();
      t.text("email").nullable();
      t.text("company").nullable();
      t.text("message").nullable();
      t.text("status").defaultTo("new");
      t.text("next_action").nullable();
      t.text("notes").nullable();
      t.text("owner").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
    })
    .createTable("quotes", (t) => {
      t.uuid("id").primary();
      t.uuid("tenant_id").references("id").inTable("tenants");
      t.text("customer_email").nullable();
      t.jsonb("items").defaultTo("[]");
      t.decimal("total", 10, 2).defaultTo(0);
      t.text("status").defaultTo("draft");
      t.text("stripe_payment_intent").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());
    })
    .createTable("invoices", (t) => {
      t.uuid("id").primary();
      t.uuid("tenant_id").references("id").inTable("tenants");
      t.uuid("quote_id").nullable();
      t.text("stripe_id").nullable();
      t.decimal("amount", 10, 2).defaultTo(0);
      t.text("status").defaultTo("pending");
      t.timestamp("created_at").defaultTo(knex.fn.now());
    })
    .createTable("quick_issues", (t) => {
      t.uuid("id").primary();
      t.uuid("tenant_id").references("id").inTable("tenants");
      t.text("label").notNullable();
      t.text("icon").nullable();
      t.text("prompt").nullable();
      t.integer("sort_order").defaultTo(0);
      t.integer("count").defaultTo(0);
      t.text("example").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());
    })
    .createTable("metrics_daily", (t) => {
      t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      t.uuid("tenant_id").references("id").inTable("tenants");
      t.date("date").notNullable();
      t.jsonb("data").defaultTo("{}");
      t.unique(["tenant_id", "date"]);
    });

  // Indexes
  await knex.schema.raw('CREATE INDEX idx_messages_conv ON messages(conversation_id)');
  await knex.schema.raw('CREATE INDEX idx_tickets_tenant ON tickets(tenant_id)');
  await knex.schema.raw('CREATE INDEX idx_conversations_tenant ON conversations(tenant_id)');
  await knex.schema.raw('CREATE INDEX idx_conversations_user ON conversations(user_id)');
  await knex.schema.raw('CREATE INDEX idx_kb_chunks_tenant ON kb_chunks(tenant_id)');
  await knex.schema.raw('CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id)');
  await knex.schema.raw('CREATE INDEX idx_notifications_tenant ON notifications(tenant_id)');
};

exports.down = async function (knex) {
  const tables = [
    "metrics_daily", "quick_issues", "invoices", "quotes", "leads",
    "invites", "org_settings", "conversation_feedback", "notifications",
    "audit_logs", "kb_chunks", "kb_documents", "tickets", "messages",
    "conversations", "users", "tenants"
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
};
