const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const apiKey = process.env.OPENAI_API_KEY || "";
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

if (!apiKey) {
  console.error("OPENAI_API_KEY manquant.");
  process.exit(1);
}

async function run() {
  console.log(`Test OpenAI: ${baseUrl} / ${model}`);
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Dis bonjour en une phrase." }],
      temperature: 0.2,
      max_tokens: 32
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const message =
    data &&
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content
      ? data.choices[0].message.content.trim()
      : "";

  if (!message) {
    throw new Error("Reponse OpenAI vide");
  }

  console.log("OK:", message);
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
