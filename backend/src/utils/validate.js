function validateOr400(schema, res, payload) {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_payload" });
    return null;
  }
  return parsed.data;
}

module.exports = { validateOr400 };