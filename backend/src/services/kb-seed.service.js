const { ingestDocument } = require("./rag.service");

const DEFAULT_KB = [
  {
    title: "Réinitialisation de mot de passe Windows ou compte",
    content: `Symptomes: L'utilisateur ne peut plus se connecter à son poste ou à une application — message "Mot de passe incorrect" ou "Compte verrouillé".
Diagnostic: Vérifier si le Verr.Maj est activé, si le clavier est en AZERTY, si le compte est verrouillé après trop de tentatives.
Resolution:
1. Vérifier la touche Verr.Maj (lumière sur le clavier) — si allumée, appuyer dessus pour l'éteindre.
2. Sur l'écran de connexion Windows, cliquer sur "J'ai oublié mon mot de passe" ou "Autres options".
3. Si l'option n'apparaît pas, contacter le service IT pour un reset AD ou SSPR.
4. Pour un reset via le portail entreprise : ouvrir un navigateur sur un autre appareil et accéder au portail SSPR de l'organisation.
Escalade: Si le compte est verrouillé en Active Directory, seul un admin peut le débloquer — créer un ticket priorité haute.`
  },
  {
    title: "Outlook ne s'ouvre pas ou plante au démarrage",
    content: `Symptomes: Outlook refuse de démarrer, se ferme immédiatement, affiche une erreur de profil ou reste bloqué sur l'écran de chargement.
Diagnostic: Vérifier si le processus Outlook tourne encore en arrière-plan, si un complément pose problème, si le fichier OST est corrompu.
Resolution:
1. Fermer complètement Outlook : clic droit sur l'icône dans la barre en bas de l'écran → Quitter.
2. Appuyer sur la touche Windows ⊞ + R, taper "outlook /safe" → Outlook démarre en mode sans complément.
3. Si ça fonctionne en mode sans complément : Fichier → Options → Compléments → désactiver les compléments un par un.
4. En dernier recours : touche Windows ⊞ + R → taper "%localappdata%\\Microsoft\\Outlook" → renommer le fichier .ost en .ost.bak.
5. Réparer Office si toujours bloqué : Panneau de configuration → Microsoft 365 → Modifier → Réparer en ligne.
Escalade: Si le profil OST est corrompu sur plusieurs postes, escalade vers N2 pour diagnostic Exchange/serveur.`
  },
  {
    title: "VPN — impossible de se connecter en télétravail",
    content: `Symptomes: Le client VPN (AnyConnect, GlobalProtect, etc.) affiche une erreur de connexion, timeout, ou authentification refusée.
Diagnostic: Vérifier la connexion internet locale, l'état du service VPN, et si le mot de passe Windows est expiré.
Resolution:
1. Vérifier que la connexion internet fonctionne en ouvrant un site web (ex: google.com).
2. Déconnecter le VPN entièrement, attendre 15 secondes, puis tenter une nouvelle connexion.
3. Redémarrer le service VPN : touche Windows ⊞ + R → "services.msc" → chercher le service VPN → clic droit → Redémarrer.
4. Si erreur d'authentification : vérifier que le mot de passe Windows n'est pas expiré (essayer de se connecter au poste normalement).
5. Si toujours bloqué : désinstaller et réinstaller le client VPN depuis le portail IT.
Escalade: Si plusieurs utilisateurs sont bloqués en même temps, problème serveur VPN → ticket critique vers N2.`
  },
  {
    title: "Imprimante ne répond pas ou travaux bloqués",
    content: `Symptomes: L'imprimante n'imprime pas, les documents restent en attente dans la file d'impression, ou l'imprimante est affichée "hors ligne".
Diagnostic: Vérifier l'état de l'imprimante, le service Spouleur, et si les travaux sont bloqués dans la file.
Resolution:
1. Vérifier que l'imprimante est allumée et connectée (câble USB ou réseau visible, pas de lumière rouge).
2. Annuler tous les travaux en attente : cliquer sur l'icône imprimante dans la barre en bas → annuler tous les documents.
3. Redémarrer le Spouleur d'impression : touche Windows ⊞ + R → "services.msc" → Spouleur d'impression → Redémarrer.
4. Vider la file manuellement : touche Windows ⊞ + R → "%windir%\\System32\\spool\\PRINTERS" → supprimer tous les fichiers.
5. Si imprimante réseau : vérifier que le poste est sur le même réseau (pas de VPN seul sans accès réseau local).
Escalade: Si l'imprimante est en erreur matérielle (papier coincé non résolu, toner vide), escalade vers maintenance.`
  },
  {
    title: "Connexion internet ou réseau coupée",
    content: `Symptomes: Impossible d'accéder à internet ou au réseau de l'entreprise, icône réseau avec croix rouge ou point d'exclamation.
Diagnostic: Vérifier si la panne est locale (un seul poste) ou générale (plusieurs utilisateurs), et si c'est WiFi ou câble.
Resolution:
1. Tester sur un autre site web pour confirmer que c'est bien internet (pas juste un site en panne).
2. Désactiver puis réactiver la connexion : clic droit sur l'icône réseau en bas à droite → Désactiver → Activer.
3. Ouvrir un Invite de commandes (touche Windows ⊞ → taper "cmd" → Ouvrir) et taper : ipconfig /release puis ipconfig /renew.
4. Si WiFi : se rapprocher du point d'accès ou tester avec un câble Ethernet.
5. Redémarrer le poste complètement si les étapes précédentes échouent.
Escalade: Si plusieurs collègues sont touchés simultanément, escalade immédiate → problème réseau/switch/routeur.`
  },
  {
    title: "PC lent, freezes ou performances dégradées",
    content: `Symptomes: L'ordinateur est très lent à démarrer, les applications mettent du temps à répondre, le poste freeze ou se bloque.
Diagnostic: Vérifier l'utilisation CPU/RAM/disque, l'espace disque disponible, les mises à jour en cours, et les programmes au démarrage.
Resolution:
1. Appuyer sur Ctrl + Alt + Suppr → cliquer sur Gestionnaire des tâches → regarder les colonnes CPU, Mémoire, Disque (si >90% = problème).
2. Fermer les applications inutiles en arrière-plan depuis le Gestionnaire des tâches.
3. Vérifier l'espace disque : ouvrir le dossier jaune (Explorateur) → clic droit sur le disque C: → Propriétés (si <10% libre = critique).
4. Vérifier les mises à jour Windows en cours : logo Windows ⊞ → Paramètres → Windows Update.
5. Redémarrer le poste complètement (pas veille) : logo Windows ⊞ → icône ⏻ → Redémarrer.
Escalade: Si le disque est plein ou si le problème revient après redémarrage, escalade pour diagnostic matériel.`
  },
  {
    title: "Écran bleu (BSOD) — intervention technique requise",
    content: `Symptomes: Écran bleu avec un code d'erreur (ex: KERNEL_SECURITY_CHECK_FAILURE), l'ordinateur redémarre automatiquement.
Diagnostic: Identifier le code d'erreur exact, vérifier si le BSOD est récurrent ou isolé, chercher un déclencheur (mise à jour, nouveau matériel).
Resolution:
1. Noter précisément le code d'erreur affiché sur l'écran bleu.
2. Si l'ordinateur redémarre normalement après le BSOD : lancer une analyse système — touche Windows ⊞ → taper "cmd" → clic droit → Exécuter en administrateur → taper "sfc /scannow".
3. Si le BSOD revient au démarrage : démarrer en mode sans échec (appuyer sur F8 ou F11 au boot).
4. Ne pas forcer plusieurs redémarrages — cela peut aggraver une corruption de disque.
Escalade: Tout BSOD récurrent = ticket critique. Un technicien doit analyser les fichiers de vidage mémoire.`
  },
  {
    title: "Microsoft Teams — problèmes audio, vidéo ou connexion",
    content: `Symptomes: Teams ne s'ouvre pas, coupe pendant les réunions, le micro ou la caméra ne fonctionnent pas, ou Teams affiche une erreur de connexion.
Diagnostic: Vérifier si le problème est audio, vidéo ou connexion, et si Teams web fonctionne en alternative.
Resolution:
1. Quitter complètement Teams : clic droit sur l'icône Teams dans la barre en bas → Quitter.
2. Vider le cache Teams : touche Windows ⊞ + R → "%appdata%\\Microsoft\\Teams" → supprimer le dossier "Cache".
3. Relancer Teams et vérifier les périphériques : dans Teams → icône ⚙️ Paramètres → Appareils → tester le micro et la caméra.
4. Si le problème persiste, essayer Teams en version web (ouvrir le navigateur et aller sur teams.microsoft.com).
5. Vérifier que Teams n'est pas bloqué par un antivirus ou pare-feu d'entreprise.
Escalade: Si le problème touche toute une réunion ou plusieurs utilisateurs, escalade N2 pour vérification infrastructure.`
  },
  {
    title: "Incident sécurité — email suspect, phishing ou virus",
    content: `Symptomes: L'utilisateur a reçu un email bizarre, cliqué sur un lien suspect, ou voit un comportement anormal (fichiers chiffrés, fenêtres pop-up suspectes).
Diagnostic: Évaluer si l'utilisateur a cliqué ou saisi des identifiants. Toute interaction avec un contenu malveillant = incident critique.
Resolution:
1. NE PAS cliquer sur d'autres liens, ne pas fermer les fenêtres, ne pas taper de mot de passe.
2. Déconnecter immédiatement le câble réseau OU désactiver le WiFi (clic sur l'icône WiFi → Déconnecter).
3. Ne pas éteindre le poste — laisser tout comme c'est pour permettre l'analyse forensique.
4. Noter l'heure exacte, l'adresse email de l'expéditeur, et ce qui a été fait.
5. Alerter le service IT par téléphone immédiatement.
Escalade: CRITIQUE — ticket automatique créé. Ne jamais gérer seul un incident sécurité.`
  },
  {
    title: "Mise à jour Windows bloquée ou en boucle",
    content: `Symptomes: Windows Update bloqué à un pourcentage, le poste reste en "Configuration de Windows" très longtemps, ou les mises à jour échouent avec une erreur.
Diagnostic: Vérifier si c'est un blocage temporaire (patience requise) ou un échec répété avec code d'erreur.
Resolution:
1. Patienter au moins 30-60 minutes — certaines mises à jour sont longues et ne doivent pas être interrompues.
2. Si bloqué depuis plus d'1 heure : redémarrer normalement (Windows reprend généralement là où il s'était arrêté).
3. En cas d'échec répété : ouvrir cmd en administrateur → taper "net stop wuauserv" → puis "net start wuauserv".
4. Si en boucle de réparation au démarrage : laisser Windows terminer (peut prendre 10-30 min, ne pas couper le courant).
Escalade: Si le code d'erreur Windows Update persiste après 3 tentatives, escalade N2 pour diagnostic.`
  },
  {
    title: "Problème audio ou microphone (son absent ou coupé)",
    content: `Symptomes: Plus de son sur le PC, le micro n'est pas reconnu, le son est coupé dans une application spécifique.
Diagnostic: Vérifier le périphérique sélectionné, le volume, les permissions d'application, et les pilotes audio.
Resolution:
1. Vérifier que le volume n'est pas à 0 ou en sourdine : cliquer sur l'icône haut-parleur en bas à droite de l'écran.
2. Clic droit sur l'icône son → Paramètres du son → vérifier que le bon périphérique de sortie et d'entrée est sélectionné.
3. Si un casque est branché : débrancher et rebrancher — Windows doit le détecter automatiquement.
4. Pour le micro dans une application : logo Windows ⊞ → Paramètres → Confidentialité → Microphone → autoriser l'accès.
5. Mettre à jour le pilote audio : clic droit sur logo Windows ⊞ → Gestionnaire de périphériques → Contrôleurs audio → clic droit → Mettre à jour.
Escalade: Si le pilote audio est absent ou le périphérique non reconnu après mise à jour, escalade pour réinstallation.`
  },
  {
    title: "Écran noir ou second moniteur non détecté",
    content: `Symptomes: L'écran reste noir au démarrage, le second moniteur n'est pas reconnu, ou l'affichage clignote.
Diagnostic: Vérifier les câbles, les paramètres d'affichage Windows, et si le problème est matériel ou logiciel.
Resolution:
1. Vérifier que tous les câbles (HDMI, DisplayPort, USB-C) sont bien branchés des deux côtés.
2. Appuyer sur touche Windows ⊞ + P pour choisir le mode d'affichage (Dupliquer / Étendre / Écran uniquement / Second écran uniquement).
3. Clic droit sur le Bureau → Paramètres d'affichage → cliquer sur "Détecter" si le second écran n'apparaît pas.
4. Si écran noir après démarrage : maintenir le bouton power 5 secondes pour éteindre, débrancher l'alimentation 30 secondes, puis redémarrer.
5. Tester avec un câble différent pour exclure un câble défectueux.
Escalade: Si le moniteur n'est jamais détecté malgré le câble OK, problème matériel → intervention technique.`
  },
  {
    title: "Excel, Word ou PowerPoint plante ou ne répond plus",
    content: `Symptomes: Une application Office se ferme toute seule, affiche "ne répond pas", ou un fichier refuse de s'ouvrir.
Diagnostic: Vérifier si le problème est lié à un fichier spécifique ou à toute l'application, et si un complément est en cause.
Resolution:
1. Fermer l'application complètement : Ctrl + Alt + Suppr → Gestionnaire des tâches → trouver l'application → Fin de tâche.
2. Démarrer en mode sans complément : touche Windows ⊞ + R → taper "excel /safe" (ou "winword /safe") → si ça fonctionne, un complément est la cause.
3. Si le fichier semble corrompu : ouvrir Excel/Word → Fichier → Ouvrir → sélectionner le fichier → flèche à côté d'Ouvrir → "Ouvrir et réparer".
4. Réparer Office : logo Windows ⊞ → Paramètres → Applications → Microsoft 365 → Modifier → Réparer en ligne.
Escalade: Si la réparation échoue ou si plusieurs fichiers sont corrompus, escalade N2.`
  },
  {
    title: "Périphérique USB non reconnu (clé USB, souris, clavier)",
    content: `Symptomes: Un périphérique USB branché n'est pas reconnu par Windows, apparaît avec un point d'exclamation, ou ne fonctionne pas.
Diagnostic: Vérifier si c'est le port USB, le périphérique, ou le pilote qui pose problème.
Resolution:
1. Débrancher puis rebrancher le périphérique sur un autre port USB (avant du PC si vous utilisiez l'arrière, et vice versa).
2. Vérifier dans le Gestionnaire de périphériques : clic droit sur logo Windows ⊞ → Gestionnaire de périphériques → chercher un point d'exclamation jaune.
3. Clic droit sur le périphérique inconnu → Mettre à jour le pilote → Rechercher automatiquement.
4. Désactiver puis réactiver les contrôleurs USB : dans le Gestionnaire de périphériques → Contrôleurs de bus USB → clic droit → Désactiver puis Activer.
5. Si c'est une clé USB : tester sur un autre PC pour savoir si la clé elle-même est défectueuse.
Escalade: Si aucun port USB ne fonctionne, problème matériel → intervention technique.`
  },
  {
    title: "Navigateur lent ou pages qui ne chargent pas",
    content: `Symptomes: Chrome, Edge ou Firefox est lent, des pages n'arrivent pas à se charger, ou des extensions bloquent la navigation.
Diagnostic: Vérifier si le problème est lié au cache, aux extensions, ou à la connexion internet.
Resolution:
1. Vider le cache du navigateur : Ctrl + Shift + Suppr → cocher "Images en cache", "Cookies", "Données de navigation" → Effacer les données.
2. Tester en mode navigation privée : Ctrl + Shift + N (Chrome/Edge) ou Ctrl + Shift + P (Firefox) — si ça marche, une extension est en cause.
3. Désactiver les extensions une par une : Menu (⋮ ou ≡) → Extensions → Gérer les extensions.
4. Si un site spécifique ne charge pas : essayer avec un autre navigateur pour confirmer si c'est le site ou le navigateur.
5. Vérifier la connexion internet en testant un autre site.
Escalade: Si aucun navigateur ne fonctionne, problème réseau → escalade vers support réseau.`
  },
  {
    title: "Authentification MFA/2FA — code refusé ou téléphone changé",
    content: `Symptomes: Le code de vérification MFA est refusé, les SMS n'arrivent pas, ou l'utilisateur a changé de téléphone et n'a plus accès à l'application Authenticator.
Diagnostic: Vérifier l'heure du téléphone (les codes TOTP dépendent de l'heure exacte), le numéro de téléphone enregistré, et si l'app est à jour.
Resolution:
1. Vérifier que l'heure de votre téléphone est correcte et synchronisée automatiquement (Paramètres → Général → Date et heure → Automatique).
2. Dans Microsoft Authenticator : ouvrir l'app → menu ≡ ou ⋮ → Actualiser les comptes.
3. Si vous ne recevez pas le SMS : vérifier que vous avez du réseau téléphonique et que le bon numéro est enregistré.
4. En cas de changement de téléphone : contacter le service IT — un administrateur doit réinitialiser votre MFA.
5. En urgence : un admin peut générer un code de contournement temporaire (Bypass Code).
Escalade: Si l'utilisateur est complètement bloqué et ne peut accéder à rien, ticket haute priorité pour reset MFA admin.`
  },
  {
    title: "Accès refusé — dossier réseau ou application bloquée",
    content: `Symptomes: Un dossier réseau ou une application affiche "Accès refusé" ou demande des droits supplémentaires.
Diagnostic: Vérifier si l'utilisateur est bien connecté au réseau/VPN, et si les droits ont été accordés par son responsable.
Resolution:
1. Vérifier que vous êtes connecté au réseau de l'entreprise ou au VPN si vous travaillez à distance.
2. Déconnecter puis reconnecter le lecteur réseau : clic droit sur le lecteur dans le dossier jaune → Déconnecter, puis reconnecter.
3. Vérifier dans le dossier jaune que votre session Windows est bien la vôtre (nom d'utilisateur correct).
4. Si "Accès refusé" persiste : votre compte n'a pas les droits nécessaires → un responsable doit valider et demander l'accès au service IT.
Escalade: La demande de droits doit être validée par un manager → ticket avec nom de la ressource et approbation du responsable.`
  },
  {
    title: "OneDrive — synchronisation bloquée ou fichiers non synchronisés",
    content: `Symptomes: OneDrive affiche une erreur de synchronisation, certains fichiers ne se synchronisent pas, ou le nuage est rouge/jaune.
Diagnostic: Vérifier l'espace disque disponible, la connexion internet, et si des fichiers sont en conflit.
Resolution:
1. Vérifier l'espace disque disponible sur le disque C: (moins de 10% libre peut bloquer la synchro).
2. Mettre en pause puis relancer la synchronisation : clic droit sur l'icône nuage OneDrive en bas à droite → Mettre la synchronisation en pause → puis Reprendre.
3. Si conflit de fichiers : OneDrive crée une copie avec "(conflits)" dans le nom — vérifier et supprimer les doublons.
4. Se déconnecter puis reconnecter OneDrive : clic droit sur l'icône → Paramètres → Compte → Dissocier ce PC → reconnecter.
5. Vérifier que la connexion internet fonctionne normalement.
Escalade: Si des fichiers importants semblent perdus, NE PAS toucher — escalade immédiate vers N2.`
  },
  {
    title: "Création de compte nouvel arrivant — procédure onboarding",
    content: `Symptomes: Un nouvel employé arrive et a besoin d'un compte Windows, email, et accès aux outils de l'entreprise.
Diagnostic: Collecter toutes les informations nécessaires avant de créer le compte pour éviter les retards.
Resolution:
1. Collecter : nom complet, adresse email souhaitée, service/département, poste occupé, date d'arrivée, nom du manager.
2. Obtenir la validation écrite du manager (email ou formulaire interne).
3. Créer le compte Active Directory avec les informations collectées et assigner les licences Microsoft 365.
4. Ajouter l'utilisateur aux groupes de sécurité correspondant à son département et ses accès.
5. Préparer le poste physique (Windows configuré, applications installées, accès VPN si télétravail).
6. Remettre les identifiants de façon sécurisée (en main propre ou via portail sécurisé).
Escalade: Si la création est urgente (arrivée le lendemain), prioriser et notifier le manager de la validation requise.`
  },
  {
    title: "SharePoint — accès impossible ou site non trouvé",
    content: `Symptomes: Un site SharePoint est inaccessible, une bibliothèque de documents refuse l'accès, ou le site affiche une erreur 403.
Diagnostic: Vérifier le compte Microsoft 365 connecté, les permissions sur le site, et si une navigation privée résout le problème.
Resolution:
1. Vérifier que vous êtes connecté avec le bon compte Microsoft 365 (en haut à droite du navigateur → votre nom).
2. Essayer en navigation privée (Ctrl + Shift + N) pour éliminer un problème de cache ou de session.
3. Si "Accès refusé" : vous n'êtes pas membre du site ou du groupe SharePoint — demander l'accès au propriétaire du site.
4. Vérifier l'URL du site (elle doit ressembler à votreentreprise.sharepoint.com/sites/nomdusite).
5. Si le site existe mais est inaccessible, le propriétaire du site peut vous ajouter directement depuis les Paramètres du site → Autorisations.
Escalade: Si tout un service ne peut plus accéder à SharePoint, escalade N2 — problème de licence ou de tenant.`
  }
];

async function seedDefaultKB(tenantId) {
  const results = [];
  for (const doc of DEFAULT_KB) {
    try {
      const result = await ingestDocument({
        tenantId,
        title: doc.title,
        sourceType: "procedure",
        sourceUrl: `seed:default:${doc.title.toLowerCase().replace(/\s+/g, "_").slice(0, 40)}`,
        content: doc.content
      });
      results.push({ title: doc.title, chunks: result.chunk_count });
    } catch (err) {
      // non-bloquant — log et continue
      console.warn(`[kb-seed] Failed to seed "${doc.title}" for tenant ${tenantId}:`, err.message);
    }
  }
  return results;
}

module.exports = { seedDefaultKB };
