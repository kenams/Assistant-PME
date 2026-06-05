module.exports = {
  name: "006_onboarding_emails",
  up: async (pool) => {
    await pool.query(`
      ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS onboarding_j0_sent_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS onboarding_j3_sent_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS onboarding_j7_sent_at TIMESTAMP;
    `);
  },
};
