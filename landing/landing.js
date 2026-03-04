const API_BASE = "http://localhost:3001";

async function loadChallenge() {
  const label = document.getElementById("challengeLabel");
  const challengeId = document.getElementById("challengeId");
  const answerInput = document.getElementById("challengeAnswer");
  if (!label || !challengeId || !answerInput) return;

  try {
    const res = await fetch(`${API_BASE}/leads/challenge`);
    if (!res.ok) return;
    const data = await res.json();
    label.textContent = `Verification anti-spam: ${data.question}`;
    challengeId.value = data.id;
  } catch (err) {
    label.textContent = "Verification anti-spam";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadChallenge();
});
