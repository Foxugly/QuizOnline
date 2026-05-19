# Manuel — Admin de domaine

Vous êtes **owner** d'un domaine. Ce manuel couvre la gestion du domaine lui-même : membres, managers, langues, audit, transfert de propriété, notifications.

> Retour au [sommaire](index.md). Voir aussi les manuels [apprenant](learner.md) et [instructeur](instructor.md) — un admin est aussi instructeur et apprenant.

## Sommaire

1. [Le domaine, qu'est-ce que c'est](#1-le-domaine-quest-ce-que-cest)
2. [Configurer le domaine](#2-configurer-le-domaine)
3. [Gérer les managers](#3-gérer-les-managers)
4. [Gérer les membres](#4-gérer-les-membres)
5. [Demandes d'adhésion](#5-demandes-dadhésion)
6. [Inviter des utilisateurs](#6-inviter-des-utilisateurs)
7. [Analyses du domaine](#7-analyses-du-domaine)
8. [L'audit log](#8-laudit-log)
9. [Transférer la propriété](#9-transférer-la-propriété)
10. [Préférences de notification du domaine](#10-préférences-de-notification-du-domaine)

---

## 1. Le domaine, qu'est-ce que c'est

Un **domaine** est l'unité d'isolation principale de la plate-forme. Tout ce qui est créé (cours, quiz, sujets, questions) appartient à un domaine. Les droits sont scopés au domaine : un manager d'un domaine ne peut rien faire dans un autre.

Trois rôles dans un domaine :

- **Owner** — un seul. Contrôle total : ajouter des managers, transférer la propriété, supprimer le domaine.
- **Manager** — plusieurs possibles. Mêmes droits que l'owner sauf : ne peut pas transférer la propriété ni supprimer le domaine.
- **Membre** — apprenant. Voit les cours publiés du domaine, peut s'inscrire selon les modes autorisés.

## 2. Configurer le domaine

Page `/domain/<id>/edit`. Plusieurs onglets :

- **Informations** — nom, description, langues autorisées, image (multilingue via les onglets de langue).
- **Membres** — gestion des membres + managers.
- **Demandes d'adhésion** — modération.
- **Invitations** — invitations persistées, resend/revoke.
- **Audit** — historique des actions.
- **Analytics** — KPIs.

![Screenshot : page d'édition d'un domaine](screenshots/admin-01-domain-edit.png)

### Langues autorisées

Les langues que vous activez ici déterminent les langues dans lesquelles les cours peuvent être créés/traduits. Décocher une langue après qu'elle ait servi pour des traductions n'efface pas les traductions existantes — elles deviennent simplement non-éditables jusqu'à réactivation.

Choix possibles : Français, Anglais, Néerlandais, Italien, Espagnol.

## 3. Gérer les managers

Onglet « Membres » de la page d'édition du domaine. Les managers ont une section dédiée en haut. Ajoutez/retirez via le picker auto-complete.

![Screenshot : section managers](screenshots/admin-02-managers.png)

Un manager devient instructeur dans votre domaine : il peut créer, éditer, publier des cours, inviter des apprenants, etc. (voir le [manuel instructeur](instructor.md)).

## 4. Gérer les membres

Toujours dans l'onglet « Membres », la table des membres affiche pour chacun : username, email, date d'adhésion, dernière activité, actions.

Actions par ligne :

- **Retirer** — exclut le membre du domaine. Ses inscriptions aux cours restent (statut cancelled).

Actions groupées (sélection par checkbox) :

- **Retirer en masse** — confirmation requise.

## 5. Demandes d'adhésion

Onglet « Demandes ». Liste toutes les demandes d'adhésion en attente avec :

- Pseudo et email du demandeur.
- Message (s'il en a laissé un).
- Date de la demande.
- Boutons « Approuver » / « Refuser ».

![Screenshot : demandes d'adhésion](screenshots/admin-03-join-requests.png)

### Approbation / refus en masse

Sélectionnez plusieurs lignes via les checkboxes, puis « Approuver tout » ou « Refuser tout » au-dessus de la table. Une seule requête réseau, audit log unique.

### Expiration automatique

Les demandes non décidées expirent automatiquement après 30 jours. Un avertissement est envoyé au demandeur 3 jours avant.

## 6. Inviter des utilisateurs

Onglet « Invitations ». Pour pré-inviter quelqu'un (par email) avant qu'il s'inscrive sur la plate-forme — utile pour les utilisateurs qui n'existent pas encore.

![Screenshot : page d'invitations du domaine](screenshots/admin-04-domain-invites.png)

### Inviter

Saisissez une liste d'emails (un par ligne). À l'envoi :

- Chaque email reçoit un lien d'invitation valide 14 jours.
- Si vous gérez plusieurs domaines, vous pouvez cocher « Inviter aussi à ces domaines » pour fan-outer la même liste d'emails sur plusieurs domaines en une seule requête.
- L'opération compte comme un seul hit dans le throttle `domain_invite_fanout`.

### Resend / revoke

Chaque invitation envoyée apparaît dans la table avec date d'envoi, expiration, statut (en attente / acceptée / révoquée / expirée). Boutons « Renvoyer » et « Révoquer » par ligne.

## 7. Analyses du domaine

Onglet « Analyses » de la page d'édition.

![Screenshot : analytics du domaine](screenshots/admin-05-domain-analytics.png)

KPIs :

- Compteurs : membres, managers, demandes en attente.
- Taux d'acceptation des demandes d'adhésion.
- Temps médian de décision (en heures).
- Top 5 modérateurs (qui approuve/refuse le plus).

Sparkline 30 jours sur les approbations / refus.

## 8. L'audit log

Onglet « Audit » de la page d'édition. Liste les 200 dernières actions sur le domaine, triées du plus récent au plus ancien.

![Screenshot : audit log du domaine](screenshots/admin-06-audit-log.png)

Actions auditées : ajout/retrait de membre, approbation/refus de demande, envoi/révocation d'invitation, transfert de propriété, modification des langues autorisées, etc.

Chaque ligne porte : timestamp, acteur, action, métadonnées (JSON brut, déplié au clic).

## 9. Transférer la propriété

L'owner peut transférer le domaine à un autre utilisateur (membre du domaine, ou même externe via email). Action irréversible — soyez sûr.

Bouton « Transférer la propriété » dans l'onglet « Informations ». Saisissez l'email du destinataire.

![Screenshot : dialogue de transfert](screenshots/admin-07-transfer-ownership.png)

Le destinataire reçoit un email avec un lien signé vers `/transfer/accept/<token>`. Tant qu'il n'a pas cliqué et confirmé, **vous restez owner**. À l'acceptation :

- Le destinataire devient owner.
- Vous devenez manager (vous gardez les droits d'instructeur).
- Une entrée d'audit log est créée.

Le token expire dans 7 jours. Si le destinataire n'agit pas, il faut renvoyer.

## 10. Préférences de notification du domaine

Onglet « Notifications » de la page d'édition.

Pour chaque type d'événement (demande d'adhésion, invitation acceptée, etc.), vous pouvez désactiver l'envoi d'email **pour tous les destinataires du domaine** ou de notification web.

⚠️ C'est une mise en sourdine côté domaine : si un utilisateur a activé une notification mais que le domaine l'a désactivée, **rien ne part**. La logique est l'intersection des deux opt-ins. Utile pour les domaines qui veulent garder le bruit au minimum.

![Screenshot : prefs de notification du domaine](screenshots/admin-08-notification-prefs.png)
