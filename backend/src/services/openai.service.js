const fs = require("fs");
const path = require("path");
const { env } = require("../config/env");

const DEFAULT_STEPS = {
  fr: [
    "Redemarrez l'application ou le poste.",
    "Verifiez la connexion reseau ou VPN si applicable.",
    "Notez le message d'erreur exact et l'heure de debut."
  ],
  en: [
    "Restart the application or the computer.",
    "Check network or VPN connectivity if applicable.",
    "Write down the exact error message and the start time."
  ]
};

function needsTicketFor(message) {
  const text = (message || "").toLowerCase();
  return (
    text.includes("serveur") ||
    text.includes("securite") ||
    text.includes("ransomware") ||
    text.includes("materiel") ||
    text.includes("impossible") ||
    text.includes("bloque") ||
    text.includes("perte") ||
    text.includes("data") ||
    text.includes("compromis") ||
    text.includes("panne generale") ||
    text.includes("plus rien") ||
    text.includes("incident") ||
    text.includes("fuite") ||
    text.includes("phishing") ||
    text.includes("pirat")
  );
}

function detectIntent(message, language) {
  const text = (message || "").toLowerCase();

  if (
    text.includes("outlook") ||
    text.includes("mail") ||
    text.includes("email")
  ) {
    return {
      category: "email",
      steps:
        language === "en"
          ? [
              "Check the internet connection.",
              "Restart Outlook and reconnect the account.",
              "Try webmail access if available."
            ]
          : [
              "Verifiez la connexion internet.",
              "Redemarrez Outlook puis reconnectez votre compte.",
              "Essayez l'acces webmail si disponible."
            ],
      questions:
        language === "en"
          ? [
              "Does it affect one device or multiple?",
              "What is the exact error message?"
            ]
          : [
              "Le probleme concerne-t-il un seul poste ou plusieurs ?",
              "Quel est le message d'erreur exact ?"
            ]
    };
  }

  if (text.includes("teams")) {
    return {
      category: "teams",
      steps:
        language === "en"
          ? [
              "Check the internet connection and VPN if remote.",
              "Quit Teams completely and reopen it.",
              "Clear the Teams cache and retry."
            ]
          : [
              "Verifiez la connexion internet et le VPN si a distance.",
              "Quittez completement Teams puis relancez.",
              "Videz le cache Teams puis reessayez."
            ],
      questions:
        language === "en"
          ? ["Is it audio, video, or login issue?", "Any error code shown?"]
          : ["C'est un probleme audio, video ou connexion ?", "Un code erreur affiche ?"]
    };
  }

  if (text.includes("sharepoint")) {
    return {
      category: "sharepoint",
      steps:
        language === "en"
          ? [
              "Confirm you are logged with the correct Microsoft 365 account.",
              "Try access in a private browser window.",
              "Ask for site/group access if needed."
            ]
          : [
              "Verifiez que vous etes connecte au bon compte Microsoft 365.",
              "Essayez l'acces en navigation privee.",
              "Demandez l'ajout au site/groupe si besoin."
            ],
      questions:
        language === "en"
          ? ["Which site or library is blocked?", "Is it a permission or error page?"]
          : ["Quel site ou bibliotheque est bloque ?", "Est-ce un refus d'acces ou une erreur ?"]
    };
  }

  if (text.includes("onedrive")) {
    return {
      category: "onedrive",
      steps:
        language === "en"
          ? [
              "Check available disk space and internet.",
              "Pause and resume sync.",
              "Sign out and sign in again."
            ]
          : [
              "Verifiez l'espace disque et internet.",
              "Mettez en pause puis relancez la synchro.",
              "Deconnectez puis reconnectez OneDrive."
            ],
      questions:
        language === "en"
          ? ["Is it one file or all files?", "Any sync error code?"]
          : ["Un fichier ou toute la synchro ?", "Un code erreur de synchro ?"]
    };
  }

  if (text.includes("creation de compte") || text.includes("nouvel arrivant") || text.includes("onboarding")) {
    return {
      category: "account",
      steps:
        language === "en"
          ? [
              "Collect full name, department, and start date.",
              "Validate manager approval.",
              "Create account and assign licenses/groups."
            ]
          : [
              "Collectez nom, service et date d'arrivee.",
              "Validez l'accord du manager.",
              "Creez le compte et attribuez licences/groupes."
            ],
      questions:
        language === "en"
          ? ["Start date and manager name?", "Which tools/apps are required?"]
          : ["Date d'arrivee et manager ?", "Quels outils/applications requis ?"]
    };
  }

  if (text.includes("acces") || text.includes("autorisation") || text.includes("permission")) {
    return {
      category: "access",
      steps:
        language === "en"
          ? [
              "Identify the resource (app, folder, site).",
              "Confirm the requester approval.",
              "Add user to the right group."
            ]
          : [
              "Identifiez la ressource (app, dossier, site).",
              "Confirmez l'autorisation du responsable.",
              "Ajoutez l'utilisateur au bon groupe."
            ],
      questions:
        language === "en"
          ? ["Which application or folder?", "Who approved the access?"]
          : ["Quelle application ou dossier ?", "Qui a valide l'acces ?"]
    };
  }

  if (text.includes("imprimante") || text.includes("printer")) {
    return {
      category: "printer",
      steps:
        language === "en"
          ? [
              "Check the printer is powered on and connected.",
              "Restart the printer and try again.",
              "Try a different test print."
            ]
          : [
              "Verifiez que l'imprimante est allumee et connectee.",
              "Redemarrez l'imprimante puis reessayez.",
              "Essayez une autre impression de test."
            ],
      questions:
        language === "en"
          ? [
              "Is the printer USB or network?",
              "Any error light visible?"
            ]
          : [
              "L'imprimante est-elle en USB ou reseau ?",
              "Un voyant d'erreur est-il visible ?"
            ]
    };
  }

  if (text.includes("mot de passe") || text.includes("password") || text.includes("mdp")) {
    return {
      category: "password",
      steps:
        language === "en"
          ? [
              "Check Caps Lock and keyboard layout.",
              "Try the password reset portal if available.",
              "If it fails, I can create a reset ticket."
            ]
          : [
              "Verifiez la touche verr maj et la disposition du clavier.",
              "Essayez le portail de reinitialisation si disponible.",
              "Si echec, je cree un ticket pour reset."
            ],
      questions:
        language === "en"
          ? ["Is it a Windows, email, or application account?"]
          : ["S'agit-il d'un compte Windows, mail ou applicatif ?"]
    };
  }

  if (text.includes("vpn") || text.includes("connexion distante") || text.includes("remote access")) {
    return {
      category: "vpn",
      steps:
        language === "en"
          ? [
              "Check the internet connection.",
              "Disconnect and reconnect the VPN.",
              "Restart the device if VPN stays stuck."
            ]
          : [
              "Verifiez la connexion internet.",
              "Deconnectez puis reconnectez le VPN.",
              "Redemarrez le poste si le VPN reste bloque."
            ],
      questions:
        language === "en"
          ? ["What is the VPN error message?"]
          : ["Quel est le message d'erreur VPN ?"]
    };
  }

  if (text.includes("poste lent") || text.includes("lent") || text.includes("ralenti")) {
    return {
      category: "performance",
      steps:
        language === "en"
          ? [
              "Restart the device and close heavy apps.",
              "Check disk space and updates.",
              "Run an antivirus scan."
            ]
          : [
              "Redemarrez le poste et fermez les applis lourdes.",
              "Verifiez l'espace disque et les mises a jour.",
              "Lancez un scan antivirus."
            ],
      questions:
        language === "en"
          ? ["Is it slow on login or specific apps?", "Since when?"]
          : ["Le ralentissement est general ou sur une appli ?", "Depuis quand ?"]
    };
  }

  if (text.includes("wifi") || text.includes("internet") || text.includes("reseau") || text.includes("network")) {
    return {
      category: "network",
      steps:
        language === "en"
          ? [
              "Check if other sites work.",
              "Disable and re-enable Wi-Fi or network cable.",
              "Restart the device if needed."
            ]
          : [
              "Verifiez si d'autres sites fonctionnent.",
              "Desactivez puis reactivez le wifi ou cable reseau.",
              "Redemarrez le poste si besoin."
            ],
      questions:
        language === "en"
          ? ["Does this affect multiple people?"]
          : ["Le probleme touche-t-il plusieurs personnes ?"]
    };
  }

  return {
    category: "general",
    steps: DEFAULT_STEPS[language] || DEFAULT_STEPS.fr,
    questions:
      language === "en"
        ? ["What is the exact error message and when did it start?"]
        : ["Quel est le message d'erreur exact et depuis quand cela arrive-t-il ?"]
  };
}

function formatKbNotes(kbChunks) {
  if (!kbChunks || kbChunks.length === 0) {
    return "";
  }

  const top = kbChunks.slice(0, 2).map((chunk) => {
    const snippet = chunk.chunk_text.slice(0, 180).replace(/\n/g, " ");
    const title = chunk.document_title || "document";
    return `Connaissance interne (${title}): ${snippet}`;
  });

  return top.join("\n");
}

function formatSupportFooter(orgSettings, language) {
  if (!orgSettings) return "";
  const parts = [];
  if (orgSettings.support_email) {
    parts.push(`Email: ${orgSettings.support_email}`);
  }
  if (orgSettings.support_phone) {
    parts.push(`Tel: ${orgSettings.support_phone}`);
  }
  if (orgSettings.support_hours) {
    parts.push(
      language === "en"
        ? `Hours: ${orgSettings.support_hours}`
        : `Horaires: ${orgSettings.support_hours}`
    );
  }
  const header = language === "en" ? "Support contact" : "Contact support";
  const signature = orgSettings.signature ? `\n${orgSettings.signature}` : "";
  if (!parts.length && !signature) return "";
  return `\n\n${header}: ${parts.join(" | ")}${signature}`;
}

function generateSupportAnswer({ message, kbChunks, language, orgSettings }) {
  const lang = language === "en" ? "en" : "fr";
  const intent = detectIntent(message, lang);
  const steps = intent.steps || DEFAULT_STEPS[lang] || DEFAULT_STEPS.fr;
  const questions = intent.questions || [];
  const kbNote = formatKbNotes(kbChunks);
  const footer = formatSupportFooter(orgSettings, lang);

  const answer = [
    lang === "en" ? "Here is a quick first attempt:" : "Voici une premiere tentative rapide:",
    "",
    "1. " + steps[0],
    "2. " + steps[1],
    "3. " + steps[2],
    steps[3] ? "4. " + steps[3] : "",
    "",
    ...questions,
    lang === "en"
      ? "If the issue persists, you can create a ticket."
      : "Si le probleme persiste, vous pouvez creer un ticket.",
    kbNote,
    footer
  ]
    .filter(Boolean)
    .join("\n");

  const needs_ticket = needsTicketFor(message);

  return {
    answer,
    needs_ticket,
    ticket_draft: needs_ticket
      ? {
          title: `${lang === "en" ? "Support" : "Support"}: ${message.slice(0, 80)}`,
          summary: message,
          category: intent.category || "general",
          priority: "medium"
        }
      : null
  };
}

let cachedPrompt = null;
function loadSystemPrompt() {
  if (!cachedPrompt) {
    const promptPath = path.join(__dirname, "..", "prompts", "support.system.txt");
    cachedPrompt = fs.readFileSync(promptPath, "utf8");
  }
  return cachedPrompt;
}

function normalizeDraft(draft, fallbackMessage) {
  if (!draft || typeof draft !== "object") {
    return null;
  }
  const title = typeof draft.title === "string" && draft.title.trim()
    ? draft.title.trim()
    : `Support: ${fallbackMessage.slice(0, 80)}`;
  const summary = typeof draft.summary === "string" && draft.summary.trim()
    ? draft.summary.trim()
    : fallbackMessage;
  const category = typeof draft.category === "string" && draft.category.trim()
    ? draft.category.trim()
    : "general";
  const priority = ["low", "medium", "high"].includes(draft.priority)
    ? draft.priority
    : "medium";
  return { title, summary, category, priority };
}

async function callOpenAI({ message, kbChunks, language, orgSettings }) {
  const lang = language === "en" ? "en" : "fr";
  const systemPrompt = loadSystemPrompt();
  const kbNote = formatKbNotes(kbChunks);
  const footer = formatSupportFooter(orgSettings, lang);
  const contactContext = footer ? footer.replace(/\n+/g, " ").trim() : "";
  const userPrompt = [
    `Langue: ${lang}`,
    kbNote ? `Contexte:\n${kbNote}` : "",
    "Reponds en JSON strict avec les champs:",
    "- answer: string",
    "- needs_ticket: boolean",
    "- ticket_draft: { title, summary, category, priority } ou null",
    "",
    "Message utilisateur:",
    message,
    contactContext ? `Contact support: ${contactContext}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  const payload = {
    model: env.openaiModel || "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.2,
    response_format: { type: "json_object" }
  };

  const res = await fetch(`${env.openaiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openaiApiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`openai_error_${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const content =
    data &&
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content
      ? data.choices[0].message.content
      : "";
  if (!content) {
    throw new Error("openai_empty_response");
  }
  let parsed = null;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new Error("openai_invalid_json");
  }

  const answer =
    typeof parsed.answer === "string" && parsed.answer.trim()
      ? parsed.answer.trim()
      : generateSupportAnswer({ message, kbChunks, language: lang, orgSettings }).answer;
  const needs_ticket = Boolean(parsed.needs_ticket);
  const ticket_draft = needs_ticket
    ? normalizeDraft(parsed.ticket_draft, message)
    : null;
  const finalAnswer = footer && !answer.includes(footer.trim()) ? `${answer}${footer}` : answer;

  return { answer: finalAnswer, needs_ticket, ticket_draft };
}

async function answerWithLLM({ message, kbChunks, language, orgSettings }) {
  if (env.llmMode === "openai" && env.openaiApiKey) {
    try {
      return await callOpenAI({ message, kbChunks, language, orgSettings });
    } catch (err) {
      return generateSupportAnswer({ message, kbChunks, language, orgSettings });
    }
  }
  return generateSupportAnswer({ message, kbChunks, language, orgSettings });
}

module.exports = { answerWithLLM };
