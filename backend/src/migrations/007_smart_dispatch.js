exports.up = async function (knex) {
  await knex.schema
    // ─── BACKLOG GROUPS ───────────────────────────────────────────────────────
    .createTable("backlog_groups", (t) => {
      t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      t.uuid("tenant_id").references("id").inTable("tenants").onDelete("CASCADE");
      t.text("code").notNullable(); // N1, N2, N3, RESEAU, INFRA, SECU, METIER, DEPLOY, LICENCES, VIP, INTERNATIONAL, IMPRIMANTES
      t.text("label").notNullable();
      t.text("description").nullable();
      t.integer("max_load").defaultTo(50);
      t.boolean("active").defaultTo(true);
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.unique(["tenant_id", "code"]);
    })

    // ─── DISPATCH RULES ───────────────────────────────────────────────────────
    .createTable("dispatch_rules", (t) => {
      t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      t.uuid("tenant_id").references("id").inTable("tenants").onDelete("CASCADE");
      t.text("name").notNullable();
      t.jsonb("keywords").defaultTo("[]");          // ["vpn","forticlient","fortinet"]
      t.text("backlog_group_code").notNullable();    // RESEAU
      t.text("priority_override").nullable();        // high|medium|low
      t.boolean("can_auto_resolve").defaultTo(false);
      t.text("auto_resolve_response").nullable();    // template de réponse auto
      t.integer("confidence_threshold").defaultTo(70); // min % for auto dispatch
      t.boolean("active").defaultTo(true);
      t.integer("sort_order").defaultTo(100);
      t.timestamp("created_at").defaultTo(knex.fn.now());
    })

    // ─── TICKET ANALYSIS ──────────────────────────────────────────────────────
    .createTable("ticket_analysis", (t) => {
      t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      t.uuid("ticket_id").references("id").inTable("tickets").onDelete("CASCADE").unique();
      t.uuid("tenant_id").references("id").inTable("tenants").onDelete("CASCADE");
      t.text("backlog_group_code").nullable();       // routing decision
      t.text("priority_computed").nullable();        // high|medium|low|critical
      t.integer("confidence_score").defaultTo(0);   // 0-100
      t.text("resolution_type").nullable();          // auto|question|dispatch|escalate
      t.text("justification").nullable();            // short explanation (max 200 chars)
      t.jsonb("similar_ticket_ids").defaultTo("[]");
      t.text("suggested_response").nullable();       // pour auto-resolve
      t.text("clarification_question").nullable();   // si besoin info complémentaire
      t.text("ai_provider").nullable();              // openai|anthropic|mistral|ollama|rule
      t.boolean("pii_anonymized").defaultTo(false);
      t.boolean("auto_resolved").defaultTo(false);
      t.integer("processing_ms").nullable();
      t.timestamp("analyzed_at").defaultTo(knex.fn.now());
    })

    // ─── BACKLOG ASSIGNMENTS ──────────────────────────────────────────────────
    .createTable("backlog_assignments", (t) => {
      t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      t.uuid("ticket_id").references("id").inTable("tickets").onDelete("CASCADE");
      t.uuid("tenant_id").references("id").inTable("tenants").onDelete("CASCADE");
      t.text("backlog_group_code").notNullable();
      t.text("assigned_by").defaultTo("smart_dispatch"); // smart_dispatch|manual|rule
      t.uuid("assigned_by_user_id").nullable();
      t.timestamp("assigned_at").defaultTo(knex.fn.now());
    })

    // ─── SIMULATIONS ──────────────────────────────────────────────────────────
    .createTable("simulations", (t) => {
      t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      t.uuid("tenant_id").references("id").inTable("tenants").onDelete("CASCADE");
      t.text("name").notNullable();
      t.integer("ticket_count").notNullable();        // 250|500|1000
      t.text("status").defaultTo("pending");          // pending|running|completed|failed
      t.jsonb("config").defaultTo("{}");              // categories, languages, distribution
      t.jsonb("summary").defaultTo("{}");             // results summary
      t.float("score_classification").nullable();     // %
      t.float("score_dispatch").nullable();           // %
      t.float("score_auto_resolve").nullable();       // %
      t.float("score_global").nullable();             // %
      t.uuid("created_by").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("completed_at").nullable();
    })

    .createTable("simulation_tickets", (t) => {
      t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      t.uuid("simulation_id").references("id").inTable("simulations").onDelete("CASCADE");
      t.text("title").notNullable();
      t.text("description").notNullable();
      t.text("language").defaultTo("fr");            // fr|en
      t.text("expected_backlog").notNullable();       // expected routing
      t.text("expected_priority").notNullable();
      t.boolean("expected_auto_resolve").defaultTo(false);
      t.text("actual_backlog").nullable();            // what the system decided
      t.text("actual_priority").nullable();
      t.boolean("actual_auto_resolve").defaultTo(false);
      t.integer("confidence_score").nullable();
      t.boolean("classification_correct").nullable();
      t.boolean("dispatch_correct").nullable();
    })

    // ─── PROACTIVE ALERTS ─────────────────────────────────────────────────────
    .createTable("proactive_alerts", (t) => {
      t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      t.uuid("tenant_id").references("id").inTable("tenants").onDelete("CASCADE");
      t.text("type").notNullable();                  // incident_peak|anomaly|saturation
      t.text("category").nullable();                 // VPN|réseau|etc.
      t.text("backlog_group_code").nullable();
      t.integer("ticket_count").nullable();
      t.integer("window_minutes").nullable();         // ex: 25 tickets sur 60 min
      t.text("severity").defaultTo("medium");        // low|medium|high|critical
      t.text("message").notNullable();
      t.boolean("acknowledged").defaultTo(false);
      t.uuid("acknowledged_by").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
    })

    // ─── MFA / TOTP ───────────────────────────────────────────────────────────
    .createTable("user_mfa", (t) => {
      t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      t.uuid("user_id").references("id").inTable("users").onDelete("CASCADE").unique();
      t.text("totp_secret").notNullable();
      t.boolean("verified").defaultTo(false);
      t.jsonb("backup_codes").defaultTo("[]");       // hashed backup codes
      t.timestamp("enabled_at").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
    })

    // ─── SESSIONS ─────────────────────────────────────────────────────────────
    .createTable("user_sessions", (t) => {
      t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      t.uuid("user_id").references("id").inTable("users").onDelete("CASCADE");
      t.uuid("tenant_id").references("id").inTable("tenants").onDelete("CASCADE");
      t.text("token_hash").notNullable();            // SHA256 of JWT
      t.text("ip").nullable();
      t.text("user_agent").nullable();
      t.boolean("revoked").defaultTo(false);
      t.timestamp("last_active_at").defaultTo(knex.fn.now());
      t.timestamp("expires_at").notNullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
    });

  // ─── EXTEND TICKETS TABLE ──────────────────────────────────────────────────
  await knex.schema.alterTable("tickets", (t) => {
    t.text("backlog_group_code").nullable();
    t.text("source").defaultTo("web");               // web|email|glpi|api|ingest
    t.text("language").defaultTo("fr");
    t.text("country").nullable();
    t.text("site").nullable();
    t.text("impact").defaultTo("medium");            // low|medium|high|critical
    t.boolean("is_vip").defaultTo(false);
    t.text("assigned_to").nullable();                // technicien email
    t.text("resolution_type").nullable();            // auto|manual
    t.text("resolved_by_ai_provider").nullable();
  });

  // ─── EXTEND USERS TABLE ───────────────────────────────────────────────────
  await knex.schema.alterTable("users", (t) => {
    t.boolean("mfa_required").defaultTo(false);
    t.integer("failed_login_count").defaultTo(0);
    t.timestamp("locked_until").nullable();
    t.text("full_name").nullable();
    t.text("department").nullable();
    t.text("site").nullable();
    t.text("country").nullable();
    t.text("phone").nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("users", (t) => {
    t.dropColumn("mfa_required");
    t.dropColumn("failed_login_count");
    t.dropColumn("locked_until");
    t.dropColumn("full_name");
    t.dropColumn("department");
    t.dropColumn("site");
    t.dropColumn("country");
    t.dropColumn("phone");
  });
  await knex.schema.alterTable("tickets", (t) => {
    t.dropColumn("backlog_group_code");
    t.dropColumn("source");
    t.dropColumn("language");
    t.dropColumn("country");
    t.dropColumn("site");
    t.dropColumn("impact");
    t.dropColumn("is_vip");
    t.dropColumn("assigned_to");
    t.dropColumn("resolution_type");
    t.dropColumn("resolved_by_ai_provider");
  });
  await knex.schema
    .dropTableIfExists("user_sessions")
    .dropTableIfExists("user_mfa")
    .dropTableIfExists("proactive_alerts")
    .dropTableIfExists("simulation_tickets")
    .dropTableIfExists("simulations")
    .dropTableIfExists("backlog_assignments")
    .dropTableIfExists("ticket_analysis")
    .dropTableIfExists("dispatch_rules")
    .dropTableIfExists("backlog_groups");
};
