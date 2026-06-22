const express = require("express");
const { authRequired } = require("../middleware/auth");
const { requireStaff } = require("../middleware/roles");
const { generateTickets, runSimulation } = require("../services/simulation.service");
const { getKnex } = require("../services/store.service");

const router = express.Router();
router.use(authRequired, requireStaff);

// POST /api/simulation/generate
router.post("/simulation/generate", async (req, res) => {
  const count = Math.min(Math.max(parseInt(req.body.count || 250, 10), 10), 1000);
  const name = String(req.body.name || `Simulation ${count} tickets`).slice(0, 200);
  const knex = getKnex();

  const simId = require("crypto").randomUUID();
  await knex("simulations").insert({
    id: simId,
    tenant_id: req.user.tenantId,
    name,
    ticket_count: count,
    status: "pending",
    config: JSON.stringify({ count }),
    created_by: req.user.id,
    created_at: new Date(),
  });

  // Preview of tickets (not persisted to main tickets table)
  const preview = generateTickets(Math.min(count, 5));

  return res.status(201).json({ simulation_id: simId, preview, message: `Simulation créée avec ${count} tickets. Lancez POST /api/simulation/run` });
});

// POST /api/simulation/run
router.post("/simulation/run", async (req, res) => {
  const { simulation_id } = req.body;
  if (!simulation_id) return res.status(400).json({ error: "simulation_id required" });
  const knex = getKnex();
  const sim = await knex("simulations").where({ id: simulation_id, tenant_id: req.user.tenantId }).first();
  if (!sim) return res.status(404).json({ error: "simulation_not_found" });
  if (sim.status === "running") return res.status(409).json({ error: "already_running" });

  // Run async (don't wait)
  runSimulation(simulation_id, req.user.tenantId).catch(() => {});

  return res.json({ ok: true, simulation_id, message: "Simulation démarrée. Consultez GET /api/simulation/results/:id" });
});

// GET /api/simulation/results/:id
router.get("/simulation/results/:id", async (req, res) => {
  const knex = getKnex();
  const sim = await knex("simulations").where({ id: req.params.id, tenant_id: req.user.tenantId }).first();
  if (!sim) return res.status(404).json({ error: "not_found" });

  const tickets = await knex("simulation_tickets").where({ simulation_id: req.params.id }).orderBy("classification_correct").limit(100);

  const wrong = tickets.filter((t) => !t.classification_correct);

  return res.json({
    simulation: sim,
    scores: {
      classification: sim.score_classification,
      dispatch: sim.score_dispatch,
      auto_resolve: sim.score_auto_resolve,
      global: sim.score_global,
    },
    targets: { classification: 95, dispatch: 90, auto_resolve: 60 },
    sample_errors: wrong.slice(0, 20).map((t) => ({
      title: t.title,
      expected: t.expected_backlog,
      actual: t.actual_backlog,
      confidence: t.confidence_score,
    })),
  });
});

// GET /api/simulation — list simulations
router.get("/simulation", async (req, res) => {
  const knex = getKnex();
  const sims = await knex("simulations").where({ tenant_id: req.user.tenantId }).orderBy("created_at", "desc").limit(20);
  return res.json(sims);
});

module.exports = router;
