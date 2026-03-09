# Checklist Livrable (Local)

## 0) Smoke test automatique
- Lancer le backend.
- `node scripts/smoke-test-full.js`

## 1) Flux utilisateur
- Se connecter avec un compte utilisateur.
- Envoyer un message dans le chat.
- Recevoir une reponse + sources.
- Ajouter une capture (drag & drop ou copier/coller).
- Verifier la galerie de captures.
- Cliquer "Ca n'a pas marche" -> recap -> creer ticket.
- Voir le ticket dans "Mes tickets".
- Cliquer "Reprendre conversation".
- Marquer "Oui, c'est resolu".

## 2) Flux admin
- Connexion admin.
- Tester GLPI (message clair OK/KO).
- Creer une invitation utilisateur.
- Copier lien ou token.
- Verifier que l'utilisateur active le compte.

## 3) Historique + recherche
- Ouvrir "Historique".
- Rechercher une conversation.
- Ouvrir le detail + filtrer les messages.
- Ouvrir la conversation dans le chat.

## 4) Rappels
- Ajouter un ticket "open" avec une date ancienne (> seuil).
- Verifier qu'un rappel apparait et propose "Demander un suivi".

## 5) Mode simple (optionnel)
- Activer "Mode simple".
- Verifier le mini tableau de bord.
- "Poser un probleme" -> chat.
