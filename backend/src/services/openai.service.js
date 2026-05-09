const fs = require("fs");
const path = require("path");
const { env } = require("../config/env");

// ─── KNOWLEDGE BASE IA ─────────────────────────────────────────────────────
// Réponses niveau N1/N2 par catégorie. Structure :
// { detect, answer, steps, category, priority, kb_hint }

const KB = [
  {
    detect: (t) => /outlook|message.*bloque|boite.*reception|mail.*plante|email.*crash|ost.*corrompu/i.test(t),
    category: "email", priority: "high",
    answer: (t) =>
      `Outlook semble corrompu ou bloqué. Voici la procédure N1 :\n\n` +
      `1. Fermez complètement Outlook (vérifiez dans la barre des tâches)\n` +
      `2. Allez dans **Panneau de configuration → Programmes → Microsoft 365 → Modifier → Réparer en ligne** (5-10 min)\n` +
      `3. Si Outlook plante toujours, appuyez sur **Win+R**, tapez \`outlook /safe\` → Outlook démarre en mode sécurisé\n` +
      `4. En mode sécurisé, allez dans **Fichier → Options → Compléments** et désactivez les compléments un par un\n` +
      `5. Si le problème persiste après réparation : **Win+R** → \`%localappdata%\\Microsoft\\Outlook\` → renommez le fichier **.ost** en **.ost.bak** (sera recréé)\n\n` +
      `En attendant, accédez à vos emails via le **webmail** (Outlook.com ou votre serveur Exchange).`,
    kb_hint: "Réparation Outlook / profil OST corrompu"
  },
  {
    detect: (t) => /imprimante|printer|impression|imprimer|spooler|bac.*papier|toner|cartouche/i.test(t),
    category: "printer", priority: "medium",
    answer: (t) =>
      `Problème d'imprimante détecté. Procédure N1 :\n\n` +
      `1. Vérifiez que l'imprimante est **allumée** et que le voyant ne clignote pas en rouge\n` +
      `2. Appuyez sur **Win+R** → tapez \`services.msc\` → cherchez **Spouleur d'impression** → clic droit → **Redémarrer**\n` +
      `3. Supprimez les travaux bloqués : **Win+R** → \`%windir%\\System32\\spool\\PRINTERS\` → supprimez tous les fichiers\n` +
      `4. Supprimez et réinstallez l'imprimante : **Paramètres → Bluetooth et appareils → Imprimantes**\n` +
      `5. Pour une imprimante réseau : vérifiez que vous êtes bien sur le **même réseau** que l'imprimante\n\n` +
      `L'imprimante est-elle partagée en réseau ou branchée en USB directement sur votre poste ?`,
    kb_hint: "Redémarrage spouleur / réinstallation imprimante réseau"
  },
  {
    detect: (t) => /mot de passe|password|mdp|identifiant.*bloque|compte.*bloque|lockout|verrouill/i.test(t),
    category: "password", priority: "high",
    answer: (t) =>
      `Problème d'accès / mot de passe. Vérifications rapides :\n\n` +
      `1. Vérifiez la touche **Verr. Maj** (Caps Lock) allumée = mots de passe en majuscules\n` +
      `2. Vérifiez que le **clavier est en français** (AZERTY) et non en anglais (QWERTY)\n` +
      `3. Si votre compte est **verrouillé** après plusieurs tentatives, seul le service IT peut le débloquer\n` +
      `4. Pour un reset autonome : utilisez le portail **SSPR** (Self-Service Password Reset) si disponible dans votre organisation\n\n` +
      `S'agit-il d'un compte **Windows** (ouverture de session), d'un compte **email** ou d'une **application métier** ?`,
    kb_hint: "Déverrouillage compte AD / reset mot de passe"
  },
  {
    detect: (t) => /vpn|anyconnect|globalprotect|tunnel|connexion.*distante|telework|teletravail.*connexion/i.test(t),
    category: "vpn", priority: "high",
    answer: (t) =>
      `Problème VPN identifié. Procédure :\n\n` +
      `1. Vérifiez votre **connexion internet** (ouvrez un site web normal)\n` +
      `2. **Déconnectez** le VPN complètement, attendez 10 secondes, puis **reconnectez**\n` +
      `3. **Redémarrez** le service VPN : **Win+R** → \`services.msc\` → cherchez votre VPN (AnyConnect/GlobalProtect) → **Redémarrer**\n` +
      `4. Si erreur d'authentification : vérifiez que votre **mot de passe Windows** n'a pas expiré\n` +
      `5. En dernier recours : **désinstallez** et **réinstallez** le client VPN\n\n` +
      `Quel message d'erreur exact voyez-vous ?`,
    kb_hint: "Reconnexion VPN / réinstallation client"
  },
  {
    detect: (t) => /internet.*plus|plus.*internet|wifi.*marche|reseau.*coupé|ping.*echoue|connexion.*perdu|ethernet/i.test(t),
    category: "network", priority: "high",
    answer: (t) =>
      `Perte de connexion réseau/internet. Vérifications :\n\n` +
      `1. Testez sur **un autre site web** pour confirmer que c'est bien internet (pas juste un site)\n` +
      `2. **Désactivez** puis **réactivez** votre connexion : clic droit sur l'icône réseau → **Désactiver → Activer**\n` +
      `3. Ouvrez un **Invite de commandes** (Win+R → cmd) et tapez : \`ipconfig /release\` puis \`ipconfig /renew\`\n` +
      `4. Vérifiez que votre **câble Ethernet** est bien branché ou rapprochez-vous du point d'accès WiFi\n` +
      `5. Si vous êtes le seul concerné : redémarrez votre poste. Si plusieurs personnes sont touchées : contactez le service IT\n\n` +
      `Le problème touche-t-il **plusieurs collègues** ou seulement vous ?`,
    kb_hint: "Dépannage réseau / IP / WiFi entreprise"
  },
  {
    detect: (t) => /lent|ralenti|freeze|gel|bloque.*poste|ram|cpu|disque.*plein|memoire.*pleine|ventilateur/i.test(t),
    category: "hardware", priority: "medium",
    answer: (t) =>
      `Poste lent ou figé. Diagnostic rapide :\n\n` +
      `1. Appuyez sur **Ctrl+Alt+Suppr → Gestionnaire des tâches** → vérifiez les colonnes CPU, Mémoire, Disque (si > 90% = problème)\n` +
      `2. Fermez les applications **inutiles** ouvertes en arrière-plan\n` +
      `3. Vérifiez l'espace disque : ouvrez **Explorateur de fichiers** → clic droit sur C: → **Propriétés** (si < 10% libre = critique)\n` +
      `4. Vérifiez les mises à jour Windows en cours : **Paramètres → Windows Update** (une mise à jour peut bloquer le poste)\n` +
      `5. **Redémarrez** le poste complètement (pas juste veille)\n\n` +
      `Le ralentissement est-il **général** ou sur une application spécifique ?`,
    kb_hint: "Diagnostic performance / Gestionnaire des tâches"
  },
  {
    detect: (t) => /ecran bleu|bsod|blue screen|kernel|stop error|0x000|dumpfile/i.test(t),
    category: "hardware", priority: "critical",
    answer: (t) =>
      `⚠️ **Écran bleu (BSOD)** détecté — intervention technique requise.\n\n` +
      `Actions immédiates :\n` +
      `1. **Notez le code d'erreur** affiché (ex: KERNEL_SECURITY_CHECK_FAILURE, IRQL_NOT_LESS_OR_EQUAL)\n` +
      `2. Redémarrez le poste — si le BSOD revient au démarrage, passez en **mode sans échec** (F8 au boot)\n` +
      `3. En mode sans échec, ouvrez un cmd en admin et tapez : \`sfc /scannow\` (analyse des fichiers système)\n` +
      `4. **Ne forcez pas** un redémarrage répété, cela peut aggraver une corruption de disque\n\n` +
      `Je crée un ticket urgent pour qu'un technicien intervienne sur votre poste.`,
    kb_hint: "BSOD / analyse dump / réparation système"
  },
  {
    detect: (t) => /teams.*coupure|teams.*son|micro.*teams|camera.*teams|reunion.*probleme|visio.*bloque/i.test(t),
    category: "software", priority: "medium",
    answer: (t) =>
      `Problème Microsoft Teams. Résolution rapide :\n\n` +
      `1. **Quittez complètement Teams** (clic droit sur l'icône dans la barre des tâches → Quitter)\n` +
      `2. Videz le cache Teams : **Win+R** → \`%appdata%\\Microsoft\\Teams\` → supprimez le dossier **Cache**\n` +
      `3. Vérifiez les **périphériques audio/vidéo** dans Teams : **Paramètres → Appareils** → testez le micro et la caméra\n` +
      `4. Si Teams est version Bureau, essayez la **version web** (teams.microsoft.com) pour tester\n` +
      `5. Vérifiez que Teams n'est pas bloqué par un **antivirus ou pare-feu** d'entreprise\n\n` +
      `Le problème est-il sur **audio**, **vidéo**, ou vous ne pouvez pas vous **connecter** du tout ?`,
    kb_hint: "Dépannage Teams / cache / périphériques"
  },
  {
    detect: (t) => /virus|malware|ransomware|chiffre|phishing|pirat|hacker|suspicious|suspect|spam.*dangereux/i.test(t),
    category: "security", priority: "critical",
    answer: (t) =>
      `🚨 **ALERTE SÉCURITÉ** — Ne cliquez sur rien d'autre.\n\n` +
      `Actions immédiates :\n` +
      `1. **Déconnectez immédiatement** le câble réseau ou désactivez le WiFi\n` +
      `2. **Ne redémarrez pas** le poste (peut aggraver un ransomware)\n` +
      `3. **Notez** l'heure exacte et ce qui s'est passé (quel fichier, quel email)\n` +
      `4. **N'essayez pas** de supprimer vous-même les fichiers suspects\n\n` +
      `Un ticket CRITIQUE est créé. Contactez **immédiatement** votre service IT par téléphone.`,
    kb_hint: "Procédure incident sécurité / isolation poste"
  },
  {
    detect: (t) => /windows.*update|mise.*jour.*bloque|mise.*jour.*echec|update.*fail|windows.*boucle/i.test(t),
    category: "software", priority: "medium",
    answer: (t) =>
      `Problème de mise à jour Windows. Procédure :\n\n` +
      `1. **Patientez** : certaines mises à jour prennent 30-60 min (ne coupez pas le poste)\n` +
      `2. Si bloqué à > 30 min : redémarrez normalement, Windows reprend généralement où il s'était arrêté\n` +
      `3. En cas d'échec répété : ouvrez un **cmd en administrateur** → \`net stop wuauserv\` → \`net start wuauserv\`\n` +
      `4. Outil de réparation Windows Update : téléchargez **Windows Update Troubleshooter** sur support.microsoft.com\n` +
      `5. Si boucle de réparation au démarrage : laissez Windows terminer (peut prendre 10-20 min)\n\n` +
      `La mise à jour s'est-elle **bloquée pendant l'installation** ou **après redémarrage** ?`,
    kb_hint: "Dépannage Windows Update / réinitialisation agent"
  },
  {
    detect: (t) => /son.*marche|audio.*marche|micro.*marche|son.*coupé|haut.*parleur|casque.*reconnai|no sound|microphone|speaker|camera.*noir|caméra.*reconnai/i.test(t),
    category: "hardware", priority: "medium",
    answer: (t) =>
      `Problème audio ou microphone. Étapes de diagnostic :\n\n` +
      `1. Clic droit sur l'icône son (barre des tâches) → **Paramètres du son** → vérifiez que le bon périphérique est sélectionné\n` +
      `2. Vérifiez que le volume n'est pas à 0 ou en sourdine (**icône haut-parleur** en bas à droite)\n` +
      `3. Si un casque est branché : débranchez et rebranchez, Windows doit le détecter automatiquement\n` +
      `4. Mettez à jour le pilote audio : **Win+X → Gestionnaire de périphériques → Contrôleurs audio** → clic droit → **Mettre à jour le pilote**\n` +
      `5. Pour le micro : vérifiez que l'application a bien les permissions (**Paramètres → Confidentialité → Microphone**)\n\n` +
      `Le problème est-il sur **toutes les applications** ou uniquement sur Teams/Zoom ?`,
    kb_hint: "Dépannage audio / microphone / pilote son"
  },
  {
    detect: (t) => /ecran.*noir|ecran.*eteint|ecran.*vide|ecran.*ne.*allume|moniteur.*noir|double.*ecran|deuxieme.*ecran|second.*ecran|ecran.*pas.*detect/i.test(t),
    category: "hardware", priority: "high",
    answer: (t) =>
      `Problème d'écran / affichage. Vérifications :\n\n` +
      `1. Vérifiez que l'écran est **bien allumé** et que le câble (HDMI/DisplayPort/VGA) est correctement branché\n` +
      `2. Appuyez sur **Win+P** pour choisir le mode d'affichage (Dupliquer / Étendre / Écran uniquement)\n` +
      `3. Clic droit sur le Bureau → **Paramètres d'affichage** → vérifiez que le second écran est détecté\n` +
      `4. Si l'écran reste noir après démarrage : forcez l'arrêt (maintenez le bouton power 5 sec), débranchez l'alimentation 30 sec, puis redémarrez\n` +
      `5. Testez avec un **câble différent** ou sur un autre moniteur pour isoler le problème\n\n` +
      `L'écran était-il fonctionnel hier ou est-ce la première fois que vous l'utilisez ?`,
    kb_hint: "Dépannage écran noir / détection moniteur"
  },
  {
    detect: (t) => /excel.*plante|word.*plante|excel.*erreur|word.*erreur|excel.*repond|word.*repond|powerpoint.*crash|office.*plante|fichier.*corrompu|\.xlsx.*ouvre|\.docx.*ouvre/i.test(t),
    category: "software", priority: "medium",
    answer: (t) =>
      `Problème Microsoft Office (Excel/Word/PowerPoint). Procédure :\n\n` +
      `1. **Fermez complètement** l'application (vérifiez dans le Gestionnaire des tâches qu'elle n'est plus en arrière-plan)\n` +
      `2. Si le fichier semble corrompu : ouvrez Excel/Word → **Fichier → Ouvrir** → sélectionnez le fichier → cliquez sur la flèche à côté d'"Ouvrir" → **Ouvrir et réparer**\n` +
      `3. Démarrez en mode sans complément : **Win+R** → \`excel /safe\` (ou \`winword /safe\`) → si ça fonctionne, un complément est la cause\n` +
      `4. Réparez Office : **Panneau de configuration → Microsoft 365 → Modifier → Réparer en ligne**\n` +
      `5. Vérifiez l'espace disque disponible sur C: (**Explorateur → clic droit sur C: → Propriétés**)\n\n` +
      `Le problème touche-t-il **un fichier spécifique** ou **toute l'application** ?`,
    kb_hint: "Réparation Office / fichier corrompu / mode sans échec"
  },
  {
    detect: (t) => /usb.*reconnai|cle.*usb|souris.*reconnai|clavier.*reconnai|peripherique.*reconnai|device.*not.*found|lecteur.*usb|disque.*externe/i.test(t),
    category: "hardware", priority: "medium",
    answer: (t) =>
      `Périphérique USB non reconnu. Procédure :\n\n` +
      `1. Débranchez puis **rebranchez** le périphérique sur un **autre port USB** (avant du PC si vous utilisiez l'arrière, et vice versa)\n` +
      `2. Ouvrez le **Gestionnaire de périphériques** (Win+X) → vérifiez s'il y a un point d'exclamation jaune\n` +
      `3. Clic droit sur le périphérique inconnu → **Mettre à jour le pilote → Rechercher automatiquement**\n` +
      `4. Si c'est une clé USB : testez-la sur un autre PC pour vérifier si elle fonctionne\n` +
      `5. Désactivez puis réactivez les contrôleurs USB : **Gestionnaire de périphériques → Contrôleurs de bus USB** → clic droit → Désactiver puis Activer\n\n` +
      `Est-ce que ce périphérique a déjà fonctionné sur ce poste ?`,
    kb_hint: "USB non reconnu / pilote USB / gestionnaire de périphériques"
  },
  {
    detect: (t) => /navigateur.*lent|chrome.*plante|edge.*plante|firefox.*plante|site.*charge|page.*charge|cache.*navigateur|cookies|extension.*bloque/i.test(t),
    category: "software", priority: "low",
    answer: (t) =>
      `Problème de navigateur. Résolution rapide :\n\n` +
      `1. **Videz le cache** : Ctrl+Shift+Suppr → cochez "Images en cache", "Cookies", "Données de navigation" → Effacer\n` +
      `2. Testez en **mode navigation privée** (Ctrl+Shift+N dans Chrome/Edge) — si ça marche, une extension est la cause\n` +
      `3. Désactivez les extensions une par une : **Menu (⋮) → Extensions → Gérer les extensions**\n` +
      `4. Si le site ne s'ouvre que chez vous : vérifiez l'URL (http vs https), essayez un autre navigateur\n` +
      `5. Vérifiez que votre **connexion internet** fonctionne sur d'autres sites\n\n` +
      `Le problème touche-t-il **un site spécifique** ou **tous les sites** ?`,
    kb_hint: "Cache navigateur / extensions / mode privé"
  },
  {
    detect: (t) => /phishing|mail.*suspect|email.*piege|lien.*suspect|piece.*jointe.*suspect|hameçon|arnaque.*email|recu.*email.*bizarre/i.test(t),
    category: "security", priority: "high",
    answer: (t) =>
      `⚠️ **Email de phishing signalé** — Actions immédiates :\n\n` +
      `1. **Ne cliquez sur aucun lien** et n'ouvrez pas les pièces jointes si ce n'est pas déjà fait\n` +
      `2. **Ne répondez pas** à l'email et ne fournissez aucun identifiant\n` +
      `3. **Signalez** l'email : dans Outlook → clic droit → **Signaler comme junk/phishing** → "Hameçonnage"\n` +
      `4. Si vous avez **cliqué sur un lien ou saisi des identifiants** : changez immédiatement vos mots de passe et alertez le service IT\n` +
      `5. **Transférez** l'email à votre équipe sécurité (security@votre-entreprise.com) avant de le supprimer\n\n` +
      `Avez-vous **cliqué sur un lien** ou **ouvert une pièce jointe** de cet email ?`,
    kb_hint: "Procédure anti-phishing / signalement email suspect"
  },
  {
    detect: (t) => /mfa|2fa|double.*facteur|authentification.*deux|authenticator|code.*sms.*marche|code.*verification/i.test(t),
    category: "access", priority: "high",
    answer: (t) =>
      `Problème d'authentification multi-facteurs (MFA/2FA) :\n\n` +
      `1. Vérifiez que l'**heure de votre téléphone** est exacte (une heure incorrecte invalide les codes TOTP)\n` +
      `2. Si vous utilisez **Microsoft Authenticator** : ouvrez l'app → menu ⋮ → **Actualiser les comptes**\n` +
      `3. Si vous ne recevez pas le SMS : vérifiez que votre téléphone a du réseau et que le numéro est correct\n` +
      `4. En cas de changement de téléphone : contactez le service IT pour **réinitialiser votre MFA**\n` +
      `5. Solution de contournement d'urgence : un administrateur peut générer un **code de contournement** temporaire\n\n` +
      `Avez-vous récemment **changé de téléphone** ou le code TOTP est-il simplement refusé ?`,
    kb_hint: "Réinitialisation MFA / Microsoft Authenticator / TOTP"
  },
  {
    detect: (t) => /acces.*refuse|permission.*refuse|dossier.*bloque|partage.*reseau|lecteur.*reseau|\\\\server/i.test(t),
    category: "access", priority: "medium",
    answer: (t) =>
      `Problème d'accès réseau / permissions. Vérifications :\n\n` +
      `1. Vérifiez que vous êtes bien **connecté au réseau de l'entreprise** (ou VPN si à distance)\n` +
      `2. Essayez de **déconnecter et reconnecter** le lecteur réseau (clic droit → Déconnecter, puis reconnectez)\n` +
      `3. Si "Accès refusé" : votre compte n'a peut-être pas les droits → un **responsable doit valider** votre accès\n` +
      `4. Vérifiez que votre **session Windows** est bien la vôtre et non un autre utilisateur\n\n` +
      `Quel est le **chemin exact** du dossier ou de l'application que vous ne pouvez pas ouvrir ?`,
    kb_hint: "Droits NTFS / partage réseau / GPO accès"
  }
];

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
    text.includes("ransomware") ||
    text.includes("bsod") ||
    text.includes("ecran bleu") ||
    text.includes("impossible") ||
    text.includes("plus rien") ||
    text.includes("incident") ||
    text.includes("phishing") ||
    text.includes("pirat") ||
    text.includes("virus") ||
    text.includes("chiffre") ||
    text.includes("toujours pas") ||
    text.includes("toujours le meme") ||
    text.includes("ne marche toujours") ||
    text.includes("ca na pas marche") ||
    text.includes("rien ne fonctionne") ||
    text.includes("urgence") ||
    text.includes("critique") ||
    text.includes("ecran bleu") ||
    text.includes("bsod") ||
    text.includes("clique.*lien") ||
    text.includes("ouvert.*piece jointe") ||
    text.includes("plusieurs personnes") ||
    text.includes("toute l'equipe") ||
    text.includes("data loss") ||
    text.includes("fichiers.*chiffres")
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
  const text = message || "";
  const footer = formatSupportFooter(orgSettings, lang);
  const kbNote = formatKbNotes(kbChunks);

  // Try KB entries first
  const match = KB.find((entry) => entry.detect(text));

  let answer, category, priority, kb_hint;

  if (match) {
    answer = match.answer(text);
    category = match.category;
    priority = match.priority;
    kb_hint = match.kb_hint;
  } else {
    // Fallback: detect intent (legacy)
    const intent = detectIntent(text, lang);
    const steps = intent.steps || DEFAULT_STEPS[lang] || DEFAULT_STEPS.fr;
    const questions = intent.questions || [];
    answer = [
      "Voici la procédure à suivre :",
      "",
      steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
      "",
      ...(questions.length ? [questions[0]] : []),
      "Si le problème persiste après ces étapes, cliquez sur **Créer un ticket** pour qu'un technicien intervienne."
    ].filter(Boolean).join("\n");
    category = intent.category || "general";
    priority = "medium";
    kb_hint = null;
  }

  if (kbNote) answer += `\n\n📚 *Procédure interne disponible : ${kb_hint || "voir base de connaissances"}*`;
  if (footer) answer += footer;

  const needs_ticket = needsTicketFor(text) || (match && match.priority === "critical");

  // Build professional ticket title from message
  const ticketTitle = buildTicketTitle(text, category);

  return {
    answer,
    needs_ticket,
    ticket_draft: needs_ticket
      ? {
          title: ticketTitle,
          summary: buildTicketSummary(text, answer),
          category,
          priority: needs_ticket && (match?.priority === "critical") ? "critical" : priority
        }
      : null,
    kb_hint: kb_hint || null
  };
}

function buildTicketTitle(message, category) {
  const text = (message || "").trim();
  // Remove noise words and build a concise title
  const short = text.replace(/[^\w\sàâéèêëîïôùûüç'-]/gi, " ").trim().slice(0, 80);
  const catLabel = {
    email: "Messagerie", printer: "Imprimante", network: "Réseau",
    vpn: "VPN", password: "Accès/Mot de passe", hardware: "Matériel",
    software: "Logiciel", security: "SÉCURITÉ", access: "Droits d'accès",
    general: "Support IT"
  }[category] || "Support IT";
  return `[${catLabel}] ${short.charAt(0).toUpperCase() + short.slice(1)}`;
}

function buildTicketSummary(message, aiAnswer) {
  const firstStepsLine = aiAnswer.split("\n").find(l => /^\d\./.test(l));
  return [
    `Problème signalé : ${message.trim()}`,
    firstStepsLine ? `Procédure N1 tentée : ${firstStepsLine.replace(/^\d\.\s*/, "")}` : "",
    "Escalade vers N2 requise."
  ].filter(Boolean).join(" — ");
}

let cachedPrompt = null;
function loadSystemPrompt() {
  if (!cachedPrompt) {
    try {
      const promptPath = path.join(__dirname, "..", "prompts", "support.system.txt");
      cachedPrompt = fs.readFileSync(promptPath, "utf8");
    } catch {
      cachedPrompt = "You are a professional IT support assistant. Answer in JSON with fields: answer, needs_ticket, ticket_draft.";
    }
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
