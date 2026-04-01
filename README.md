# WpRef

Monorepo contenant deux applications distinctes :

- `wpref/` : backend Django REST
- `wpref-frontend/` : frontend Angular

## Position recommandée

Ne splitte pas le projet en deux repos pour l'instant. La bonne étape maintenant est de formaliser le monorepo et de rendre la frontière backend/frontend plus explicite.

## Structure actuelle

```text
WpRef/
|-- wpref/
|-- wpref-frontend/
|-- docs/
`-- scripts/
```

## Workflow de développement

- Backend : `cd wpref` puis `python manage.py runserver`
- Frontend : `cd wpref-frontend` puis `npm start`
- Synchronisation OpenAPI : `powershell -ExecutionPolicy Bypass -File .\scripts\sync-openapi.ps1`

## Principes de structure

- Le backend et le frontend restent découplés à l'exécution.
- Le contrat partagé passe par OpenAPI, pas par du code partagé.
- Les artefacts locaux ne doivent pas être committés.
- La séparation en deux repos ne devient utile que si les cycles de release, les équipes ou les permissions divergent.

## Documentation de structure

Le cadrage cible du dépôt est décrit dans [docs/repository-structure.md](docs/repository-structure.md).

## Référence API

La documentation ci-dessous décrit les endpoints exposés par le backend.

Version OpenAPI : 3.0.3  
Base path (dev) : `http://localhost:8000`

---

## 1. Authentification JWT

### 1.1. Obtenir un token

**POST** `/api/token/`

- **Description** : Authentification par login/mot de passe, renvoie `access` + `refresh`.
- **Corps (JSON)** – `TokenObtainPair`  
  - `username` *(string, required)*  
  - `password` *(string, required)*  
- **Réponse 200 (JSON)** – `TokenObtainPair`  
  - `access` *(string)* – JWT access  
  - `refresh` *(string)* – JWT refresh  

---

### 1.2. Rafraîchir un token

**POST** `/api/token/refresh/`

- **Description** : Renvoie un nouveau `access` à partir d’un `refresh`.
- **Corps (JSON)** – `TokenRefresh`  
  - `refresh` *(string, required)*  
- **Réponse 200 (JSON)** – `TokenRefresh`  
  - `access` *(string)*  

---

## 2. Subjects

### 2.1. Lister les sujets

**GET** `/api/subject/`

- **Entrée** : aucune.
- **Réponse 200 (JSON)** – `Subject[]`  
  - `id` *(int, readOnly)*  
  - `name` *(string, required)*  
  - `slug` *(string)*  
  - `description` *(string)*  

---

### 2.2. Créer un sujet

**POST** `/api/subject/`

- **Corps (JSON)** – `Subject`  
  - `name` *(string, required)*  
  - `slug` *(string, optionnel)*  
  - `description` *(string, optionnel)*  
- **Réponse 201 (JSON)** – `Subject` (avec `id` rempli)

---

### 2.3. Récupérer / modifier / supprimer un sujet

**GET** `/api/subject/{id}/`  
**PUT** `/api/subject/{id}/`  
**PATCH** `/api/subject/{id}/`  
**DELETE** `/api/subject/{id}/`

- **Paramètres path**  
  - `id` *(int, required)*  
- **GET – Réponse 200** : `Subject`  
- **PUT/PATCH – Corps (JSON)** : `Subject` (ou `PatchedSubject` pour PATCH)  
- **PUT/PATCH – Réponse 200** : `Subject`  
- **DELETE – Réponse 204** : pas de corps.

---

## 3. Questions

### 3.1. Lister les questions

**GET** `/api/question/`

- **Entrée** : éventuellement filtres DRF (non détaillés dans le YAML).
- **Réponse 200 (JSON)** – `Question[]`  
  Chaque `Question` contient notamment :
  - `id` *(int, readOnly)*  
  - `title` *(string, required)*  
  - `description` *(string)*  
  - `explanation` *(string)*  
  - `allow_multiple_correct` *(bool)*  
  - `active` *(bool)*  
  - `is_mode_practice` *(bool)*  
  - `is_mode_exam` *(bool)*  
  - `subjects` *(Subject[], readOnly)*  
  - `answer_options` *(QuestionAnswerOption[])*  
  - `created_at` *(datetime, readOnly)*  

`QuestionAnswerOption` :  
- `id` *(int, readOnly)*  
- `content` *(string, required)*  
- `is_correct` *(bool)*  
- `sort_order` *(int)*  

---

### 3.2. Créer une question

**POST** `/api/question/`

- **Corps (JSON)** – `Question`  
  Champs principaux en écriture :
  - `title` *(string, required)*  
  - `description` *(string, optionnel)*  
  - `explanation` *(string, optionnel)*  
  - `allow_multiple_correct` *(bool)*  
  - `active` *(bool)*  
  - `is_mode_practice` *(bool)*  
  - `is_mode_exam` *(bool)*  
  - `subject_ids` *(int[], writeOnly)* – IDs de `Subject`  
  - `answer_options` *(QuestionAnswerOption[])*  
- **Réponse 201 (JSON)** – `Question` complète (avec `id`, `subjects`, `created_at`, etc.)

---

### 3.3. Récupérer / modifier / supprimer une question

**GET** `/api/question/{id}/`  
**PUT** `/api/question/{id}/`  
**PATCH** `/api/question/{id}/`  
**DELETE** `/api/question/{id}/`

- **Paramètres path**  
  - `id` *(int, required)*  
- **GET – Réponse 200** : `Question`  
- **PUT – Corps (JSON)** : `Question` → Réponse 200 : `Question`  
- **PATCH – Corps (JSON)** : `PatchedQuestion` → Réponse 200 : `Question`  
- **DELETE – Réponse 204** : pas de corps.

---

## 4. QuizTemplate (modèles de quiz)

Base : `/api/quiz/template/`  

### 4.1. Lister les QuizTemplate

**GET** `/api/quiz/template/`

- **Description** : Gestion des modèles de quiz (CRUD staff).  
- **Réponse 200 (JSON)** – `QuizTemplate[]`

`QuizTemplate` (principaux champs) :
- `id` *(int, readOnly)*  
- `title` *(string, required)*  
- `slug` *(string, readOnly)*  
- `mode` *(ModeEnum: "practice" | "exam")*  
- `description` *(string)*  
- `max_questions` *(int)*  
- `permanent` *(bool)*  
- `started_at` *(datetime|null)*  
- `ended_at` *(datetime|null)*  
- `with_duration` *(bool)*  
- `duration` *(int, minutes)*  
- `active` *(bool)*  
- `can_answer` *(bool, readOnly)*  
- `questions_count` *(int, readOnly)*  
- `quiz_questions` *(QuizQuestion[], readOnly)*  

`QuizQuestion` :
- `id` *(int, readOnly)*  
- `quiz` *(int, readOnly)*  
- `question` *(int, readOnly)*  
- `question_id` *(int, writeOnly)*  
- `question_title` *(string, readOnly)*  
- `sort_order` *(int)*  
- `weight` *(int)*  

---

### 4.2. Créer un QuizTemplate

**POST** `/api/quiz/template/`

- **Corps (JSON)** – `QuizTemplate`  
  Champs classiques : `title`, `description`, `mode`, `max_questions`, `permanent`, `started_at`, `ended_at`, `with_duration`, `duration`, `active`, etc.  
- **Réponse 201 (JSON)** – `QuizTemplate` (avec `id`, `slug`, `quiz_questions` vide au départ).

---

### 4.3. Récupérer / modifier / supprimer un QuizTemplate

**GET** `/api/quiz/template/{id}/`  
**PUT** `/api/quiz/template/{id}/`  
**PATCH** `/api/quiz/template/{id}/`  
**DELETE** `/api/quiz/template/{id}/`

- **Paramètres path**  
  - `id` *(int, required)*  
- **GET – Réponse 200** : `QuizTemplate`  
- **PUT – Corps (JSON)** : `QuizTemplate` → Réponse 200 : `QuizTemplate`  
- **PATCH – Corps (JSON)** : `PatchedQuizTemplate` → Réponse 200 : `QuizTemplate`  
- **DELETE – Réponse 204** : pas de corps.

---

### 4.4. Ajouter une question à un QuizTemplate

**POST** `/api/quiz/template/{id}/question/`

- **Paramètres path**  
  - `id` *(int, required)* – ID du `QuizTemplate`  
- **Corps (JSON)** – `QuizQuestion`  
  - `question_id` *(int, required)* – ID de la `Question`  
  - `sort_order` *(int, optionnel)*  
  - `weight` *(int, optionnel)*  
- **Réponse 201 (JSON)** – `QuizQuestion`

---

### 4.5. Modifier / supprimer une QuizQuestion

**PATCH** `/api/quiz/template/{id}/question/{qq_id}/`  
**DELETE** `/api/quiz/template/{id}/question/{qq_id}/`

- **Paramètres path**  
  - `id` *(int, required)* – QuizTemplate  
  - `qq_id` *(int, required)* – QuizQuestion  
- **PATCH – Corps (JSON)** : `PatchedQuizQuestion` (sort_order, weight…)  
- **PATCH – Réponse 200** : `QuizQuestion`  
- **DELETE – Réponse 204** : pas de corps.

---

### 4.6. Lister les QuizTemplate disponibles pour l’utilisateur

**GET** `/api/quiz/template/available/`

- **Description** : retourne les templates pour lesquels `can_answer == true` pour l’utilisateur courant.
- **Réponse 200 (JSON)** – `QuizTemplate[]`

---

### 4.7. Générer un QuizTemplate à partir de sujets

**POST** `/api/quiz/template/generate-from-subjects/`

- **Description** : génère un QuizTemplate à partir d’une sélection de `Subject`.  
- **Corps (JSON)** – `QuizTemplate`  
  Typiquement :  
  - `title` *(string)*  
  - éventuellement champs custom (ex. `subject_ids`, `max_questions` si tu les as ajoutés dans le serializer)  
- **Réponse 200 (JSON)** – `QuizTemplate` créé (avec `quiz_questions` générées).

*(La forme exacte des champs liés aux sujets dépend de ton implémentation — dans le YAML, le corps est typé `QuizTemplate`.)*

---

## 5. Quiz (sessions)

Base : `/api/quiz/`

### 5.1. Lister les quiz (sessions)

**GET** `/api/quiz/`

- **Description** : liste des sessions de quiz (`Quiz`) accessibles (souvent filtrées par user).  
- **Réponse 200 (JSON)** – `Quiz[]`

`Quiz` :  
- `id` *(int, readOnly)*  
- `quiz_template` *(int)*  
- `quiz_template_title` *(string, readOnly)*  
- `user` *(int|null, readOnly)*  
- `mode` *(string, readOnly)*  
- `created_at` *(datetime, readOnly)*  
- `started_at` *(datetime|null)*  
- `ended_at` *(datetime|null)*  
- `active` *(bool)*  
- `can_answer` *(bool, readOnly)*  
- `max_questions` *(int, readOnly)*  

---

### 5.2. Créer un quiz (session)

**POST** `/api/quiz/`

- **Corps (JSON)** – `Quiz`  
  En pratique, tu fournis au minimum :  
  - `quiz_template` *(int, required)*  
  - `active` *(bool, optionnel)*  
- **Réponse 201 (JSON)** – `Quiz`

---

### 5.3. Récupérer / modifier / supprimer une session

**GET** `/api/quiz/{id}/`  
**PUT** `/api/quiz/{id}/`  
**PATCH** `/api/quiz/{id}/`  
**DELETE** `/api/quiz/{id}/`

- **Paramètres path**  
  - `id` *(int, required)* – ID du `Quiz`  
- **GET – Réponse 200** : `Quiz`  
- **PUT/PATCH – Corps (JSON)** : `Quiz` (ou `PatchedQuiz`)  
- **PUT/PATCH – Réponse 200** : `Quiz`  
- **DELETE – Réponse 204** : pas de corps.

---

### 5.4. Démarrer une session par ID

**POST** `/api/quiz/{id}/start/`

- **Description** : démarre (ou redémarre) explicitement un `Quiz` donné.  
- **Paramètres path**  
  - `id` *(int, required)*  
- **Corps (JSON)** – `Quiz` (souvent vide ou avec `active=true`)  
- **Réponse 200 (JSON)** – `Quiz` mis à jour (`started_at`, `active`, `ended_at` calculée, etc.).

---

### 5.5. Démarrer un quiz à partir d’un template (current user)

**POST** `/api/quiz/start/`

- **Description** : créer & démarrer un quiz pour l’utilisateur courant à partir d’un template.
- **Corps (JSON)** – `Quiz`  
  En pratique, tu fournis :
  - `quiz_template` *(int, required)*  
- **Réponse 200 (JSON)** – `Quiz` créé & démarré.

---

### 5.6. Clôturer une session

**POST** `/api/quiz/{id}/close/`

- **Description** : clôture la session de quiz (active=false, ended_at fixé).
- **Paramètres path**  
  - `id` *(int, required)*  
- **Corps (JSON)** – `Quiz` (souvent vide)  
- **Réponse 200 (JSON)** – `Quiz` mis à jour.

---

### 5.7. Détails étendus d’une session

**GET** `/api/quiz/{id}/details/`

- **Description** : vue détaillée d’un quiz (selon ton serializer côté vue).
- **Paramètres path**  
  - `id` *(int, required)*  
- **Réponse 200 (JSON)** – `Quiz` (ou un serializer enrichi, mais typé `Quiz` dans le YAML)

---

### 5.8. Résumé d’une session

**GET** `/api/quiz/{id}/summary/`

- **Description** : résumé du quiz (score global, etc.).  
- **Paramètres path**  
  - `id` *(int, required)*  
- **Réponse 200 (JSON)** – `Quiz` (le YAML le typage en `Quiz`; la structure exacte dépend de ton `QuizSummarySerializer` si tu en utilises un sous le capot).

---

### 5.9. Création de quiz en masse depuis un template

**POST** `/api/quiz/bulk-create-from-template/`

- **Description** : crée plusieurs sessions `Quiz` à partir d’un `QuizTemplate` (typiquement pour plusieurs users).
- **Corps (JSON)** – typé `Quiz` dans le YAML, mais dans la pratique tu auras probablement quelque chose comme :
  ```json
  {
    "quiz_template": 3,
    "user_ids": [1, 2, 3]
  }

# 6. QuizQuestionAnswer — Répondre aux questions d’un Quiz

Base path : `/api/quiz/{quiz_id}/answer/`

Ces endpoints permettent :
- d’obtenir une question d’un quiz (avec options, état sélectionné, correction si disponible)
- de répondre à une question
- de modifier une réponse
- de supprimer une réponse
- de relire les réponses après clôture du quiz

Toutes les actions nécessitent que :
- l’utilisateur soit **le propriétaire du quiz**  
  ou  
- soit **staff / superuser**

---

# 6.1. Obtenir une question du quiz (GET)

**GET** `/api/quiz/{quiz_id}/answer/{question_order}/`

Permet d’afficher la question *n° question_order* avec ses options.

### Paramètres

| Paramètre | Type | Description |
|----------|------|-------------|
| `quiz_id` | int | ID du quiz |
| `question_order` | int | Indice de la question (1-based) |

---

### Exemple de réponse 200
    {
      "question_order": 1,
      "title": "Quelle est la définition de Scrum ?",
      "content": "Scrum est un cadre de travail léger...",
      "options": [
        {
          "id": 12,
          "content": "Une méthode pour gérer des projets",
          "is_selected": false
        },
        {
          "id": 13,
          "content": "Un framework pour résoudre des problèmes complexes",
          "is_selected": true
        }
      ],
      "can_answer": true
    }

## 6.2. Répondre à une question (POST)

**POST** `/api/quiz/{quiz_id}/answer/{question_order}/`

Permet d’envoyer une ou plusieurs réponses selon le type de question.

Corps attendu
Champ	Type	Obligatoire	Description
selected_option_ids	array[int]	oui	Liste des IDs de réponses choisies
given_answer	string	non	Pour les questions à texte libre
Exemple de payload
    {
      "selected_option_ids": [13]
    }

Réponse 200/201
    {
      "question_order": 1,
      "is_correct": true,
      "earned_score": 1,
      "max_score": 1,
      "selected_option_ids": [13]
    }

## 6.3. Modifier une réponse (PATCH)

***PATCH*** `/api/quiz/{quiz_id}/answer/{question_order}/`

Même format que POST.
Permet l’édition uniquement si quiz.can_answer == True.

Exemple
    {
      "selected_option_ids": [12, 13]
    }

## 6.4. Supprimer une réponse (DELETE)

***DELETE*** `/api/quiz/{quiz_id}/answer/{question_order}/`

Supprime l’ensemble de la réponse (selected_options + given_answer).

Réponse 204

Pas de contenu.

## 6.5. Relire les réponses après clôture (GET)

Lorsque quiz.can_answer == False, alors :

is_correct est retourné

les réponses correctes peuvent être exposées selon la configuration :

Conditions d’exposition
Condition	Résultats visibles ?
template.show_results_immediately == True	Oui
template.show_results_at <= now	Oui
Sinon	Non, l’utilisateur ne voit pas encore les scores

Exemple de réponse en mode "post-quiz"

    {
      "question_order": 2,
      "title": "Quelle est la taille du Scrum Team ?",
      "options": [
        {
          "id": 20,
          "content": "10 personnes",
          "is_selected": true,
          "is_correct": false
        },
        {
          "id": 22,
          "content": "Entre 10 et 12 personnes",
          "is_selected": false,
          "is_correct": false
        },
        {
          "id": 21,
          "content": "10 personnes ou moins",
          "is_selected": false,
          "is_correct": true
        }
      ],
      "is_correct": false,
      "earned_score": 0,
      "max_score": 1
    }

## 6.6. Règles métier importantes


---
|🔐| Permissions|
|---
|Action	| Owner	| Staff |
GET question	✔	✔
POST réponse	✔	✔
PATCH réponse	✔	✔
DELETE réponse	✔	✔

## ⏳ Restrictions temporelles

Un utilisateur ne peut pas répondre si :

quiz.active == False

quiz.can_answer == False

délai expiré (duration)

quiz déjà clôturé

Le serveur renvoie alors :

    {
      "detail": "Ce quiz n'est plus disponible pour répondre."
    }

## 🧮 Calculs des scores

Comparaison selected_option_ids vs correct_options

Application du weight de la question

Champ is_correct mis à jour automatiquement

Les résultats ne sont visibles que si les conditions d'affichage sont remplies

6.7. Résumé des endpoints QuizQuestionAnswer

Lire une question

***GET***	`/api/quiz/{quiz_id}/answer/{question_order}/`

Soumettre une réponse

***POST***	`/api/quiz/{quiz_id}/answer/{question_order}/`	

Modifier une réponse

***PATCH***	`/api/quiz/{quiz_id}/answer/{question_order}/`	

Effacer une réponse

***DELETE***	`/api/quiz/{quiz_id}/answer/{question_order}/`	


# 7. Utilisateurs

Base path : `/api/user/`

Les endpoints ci-dessous permettent de gérer les utilisateurs, leurs informations personnelles, leurs mots de passe, ainsi que leurs quiz associés.

---

## 7.1. Lister les utilisateurs

**GET** `/api/user/`

- Retourne la liste complète des utilisateurs (réservé aux administrateurs / staff).

### Réponse 200 — `CustomUser[]`

```json
[
  {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "first_name": "",
    "last_name": "",
    "is_staff": true,
    "is_superuser": true,
    "is_active": true
  }
]
