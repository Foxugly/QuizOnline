import {LanguageEnumDto} from '../../api/generated/model/language-enum';

export type FeatureItem = {
  icon: string;
  title: string;
  description: string;
};

export type FeatureSection = {
  slug: string;
  icon: string;
  badge: string;
  title: string;
  intro: string;
  features: FeatureItem[];
};

export type FeaturesUiText = {
  eyebrow: string;
  title: string;
  intro: string;
  ctaPrimary: string;
  ctaSecondary: string;
  ctaLoggedIn: string;
  sections: FeatureSection[];
};

type SectionDef = {
  slug: string;
  icon: string;
  features: ReadonlyArray<{key: string; icon: string}>;
};

const SECTION_DEFS: ReadonlyArray<SectionDef> = [
  {
    slug: 'domains',
    icon: 'pi-th-large',
    features: [
      {key: 'roles', icon: 'pi-users'},
      {key: 'policies', icon: 'pi-key'},
      {key: 'requests', icon: 'pi-user-plus'},
      {key: 'notifications', icon: 'pi-envelope'},
      {key: 'multilingual', icon: 'pi-globe'},
      {key: 'aiTranslate', icon: 'pi-sparkles'},
      {key: 'languageGate', icon: 'pi-filter'},
    ],
  },
  {
    slug: 'subjects',
    icon: 'pi-tags',
    features: [
      {key: 'crud', icon: 'pi-folder-open'},
      {key: 'multilingual', icon: 'pi-globe'},
      {key: 'aiTranslate', icon: 'pi-sparkles'},
      {key: 'tagging', icon: 'pi-link'},
      {key: 'autoCreate', icon: 'pi-bolt'},
    ],
  },
  {
    slug: 'questions',
    icon: 'pi-question-circle',
    features: [
      {key: 'multipleChoice', icon: 'pi-list'},
      {key: 'multilingual', icon: 'pi-globe'},
      {key: 'images', icon: 'pi-image'},
      {key: 'videos', icon: 'pi-video'},
      {key: 'youtube', icon: 'pi-youtube'},
      {key: 'modes', icon: 'pi-flag'},
      {key: 'explanations', icon: 'pi-info-circle'},
      {key: 'aiTranslate', icon: 'pi-sparkles'},
      {key: 'importExport', icon: 'pi-file-import'},
      {key: 'duplicate', icon: 'pi-clone'},
    ],
  },
  {
    slug: 'quizzes',
    icon: 'pi-stopwatch',
    features: [
      {key: 'modes', icon: 'pi-bolt'},
      {key: 'timer', icon: 'pi-clock'},
      {key: 'window', icon: 'pi-calendar'},
      {key: 'visibility', icon: 'pi-eye'},
      {key: 'public', icon: 'pi-globe'},
      {key: 'assignment', icon: 'pi-send'},
      {key: 'emails', icon: 'pi-envelope'},
      {key: 'messages', icon: 'pi-comments'},
      {key: 'scoring', icon: 'pi-chart-line'},
      {key: 'pdf', icon: 'pi-file-pdf'},
      {key: 'tracking', icon: 'pi-history'},
    ],
  },
  {
    slug: 'platform',
    icon: 'pi-cog',
    features: [
      {key: 'auth', icon: 'pi-shield'},
      {key: 'multilingual', icon: 'pi-globe'},
      {key: 'outbox', icon: 'pi-inbox'},
      {key: 'dashboard', icon: 'pi-chart-bar'},
      {key: 'diagnostics', icon: 'pi-server'},
      {key: 'rateLimit', icon: 'pi-lock'},
      {key: 'api', icon: 'pi-code'},
    ],
  },
];

type FeatureContent = {title: string; description: string};
type SectionContent = {
  badge: string;
  title: string;
  intro: string;
  features: Record<string, FeatureContent>;
};
type FeaturesContent = {
  eyebrow: string;
  title: string;
  intro: string;
  ctaPrimary: string;
  ctaSecondary: string;
  ctaLoggedIn: string;
  sections: Record<string, SectionContent>;
};

const FR_CONTENT: FeaturesContent = {
  eyebrow: 'Plateforme',
  title: 'Tout pour concevoir des quiz qui comptent',
  intro: 'De la structure organisationnelle aux résultats détaillés, QuizOnline rassemble la création de contenu, la diffusion et le suivi dans un seul produit pensé multilingue.',
  ctaPrimary: 'Créer un compte',
  ctaSecondary: 'Se connecter',
  ctaLoggedIn: 'Voir mes quiz',
  sections: {
    domains: {
      badge: 'Domaines',
      title: 'Organisez vos contenus par domaine',
      intro: 'Donnez à chaque entité son espace, ses rôles et ses règles. Les domaines structurent toute la plateforme.',
      features: {
        roles: {title: 'Hiérarchie de rôles', description: 'Owner, gestionnaires et membres avec des permissions adaptées à chaque niveau.'},
        policies: {title: 'Politiques d\'adhésion', description: 'Approbation automatique, par le propriétaire ou par les gestionnaires : trois modes au choix.'},
        requests: {title: 'Demandes en libre-service', description: 'Workflow complet d\'adhésion avec approbation, refus motivé et suivi du statut.'},
        notifications: {title: 'Notifications email', description: 'Owners et demandeurs informés à chaque étape, dans leur propre langue.'},
        multilingual: {title: 'Multilingue natif', description: 'Nom et description traduisibles dans 5 langues : FR, EN, NL, IT, ES.'},
        aiTranslate: {title: 'Traductions IA', description: 'Pré-remplissez les traductions en un clic grâce à l\'intégration DeepL.'},
        languageGate: {title: 'Langues autorisées', description: 'Restreignez les langues d\'édition propres à chaque domaine.'},
      },
    },
    subjects: {
      badge: 'Sujets',
      title: 'Catégorisez avec souplesse',
      intro: 'Des sujets pour organiser librement les thématiques de chaque domaine.',
      features: {
        crud: {title: 'Gestion complète', description: 'Création, édition et activation de sujets propres à chaque domaine.'},
        multilingual: {title: 'Contenus multilingues', description: 'Nom et description traduisibles en 5 langues.'},
        aiTranslate: {title: 'Traductions DeepL', description: 'Génération automatique des traductions, prête à relire.'},
        tagging: {title: 'Liaison aux questions', description: 'Tagging multi-sujets avec ordre personnalisable par sujet.'},
        autoCreate: {title: 'Auto-création à l\'import', description: 'Les sujets manquants se créent automatiquement lors de l\'import.'},
      },
    },
    questions: {
      badge: 'Questions',
      title: 'Une banque de questions sans compromis',
      intro: 'Du QCM enrichi de médias aux explications pédagogiques, chaque question s\'exprime dans toutes vos langues.',
      features: {
        multipleChoice: {title: 'Choix multiple flexible', description: 'Une seule réponse correcte ou plusieurs : vous décidez par question.'},
        multilingual: {title: 'Contenu multilingue', description: 'Titre, description, explication et options de réponse traduits en 5 langues.'},
        images: {title: 'Images intégrées', description: 'Upload avec déduplication automatique : illustrez sans gonfler le stockage.'},
        videos: {title: 'Vidéos hébergées', description: 'Upload de fichiers vidéo directement attachés à la question.'},
        youtube: {title: 'YouTube prêt à l\'emploi', description: 'Collez n\'importe quelle URL — watch, shorts, embed, youtu.be — elle est normalisée.'},
        modes: {title: 'Practice ou examen', description: 'Activez chaque question pour le mode entraînement, examen, ou les deux.'},
        explanations: {title: 'Explications détaillées', description: 'Texte riche affiché après la réponse en mode practice.'},
        aiTranslate: {title: 'Traductions en lot', description: 'DeepL traduit titre, description, explication et options en un seul appel.'},
        importExport: {title: 'Import / Export structurés', description: 'JSON versionné et CSV pour migrer ou archiver vos questions.'},
        duplicate: {title: 'Duplication', description: 'Clonez une question existante pour gagner du temps sur les variantes.'},
      },
    },
    quizzes: {
      badge: 'Quiz',
      title: 'Diffusez, chronométrez, suivez',
      intro: 'Practice, examen ou évaluation publique : chaque template combine vos règles de mode, durée et visibilité.',
      features: {
        modes: {title: 'Practice et Exam', description: 'Feedback immédiat ou tentative unique avec révélation contrôlée.'},
        timer: {title: 'Timer configurable', description: 'Durée par template, expiration automatique côté serveur.'},
        window: {title: 'Fenêtre de disponibilité', description: 'Plage de dates ou template permanent — au choix.'},
        visibility: {title: 'Visibilité fine', description: 'Score et détail des réponses : immédiat, programmé à une date, ou jamais.'},
        public: {title: 'Quiz publics', description: 'Permettez l\'accès sans appartenance au domaine pour les évaluations ouvertes.'},
        assignment: {title: 'Assignation en masse', description: 'Affectez un template à plusieurs utilisateurs en un appel atomique.'},
        emails: {title: 'Emails d\'assignation', description: 'Notification automatique avec deadline et lien direct, dans la langue du destinataire.'},
        messages: {title: 'Messages contextuels', description: 'Threads d\'alertes par question : ouvrez une conversation pendant le quiz.'},
        scoring: {title: 'Scoring pondéré', description: 'Poids par question dans un template, évaluation tout-ou-rien sur les options correctes.'},
        pdf: {title: 'Export PDF', description: 'Génération A4 du résultat avec score, détails par question et explications.'},
        tracking: {title: 'Suivi des sessions', description: 'Vue par template avec statut de complétion par utilisateur.'},
      },
    },
    platform: {
      badge: 'Plateforme',
      title: 'Une infrastructure prête pour la production',
      intro: 'Tout ce qui rend la plateforme fiable, multilingue et observable au quotidien.',
      features: {
        auth: {title: 'Auth JWT et confirmation email', description: 'Inscription, confirmation email et réinitialisation de mot de passe sécurisées.'},
        multilingual: {title: 'UI multilingue', description: '5 langues couvertes côté interface : FR, EN, NL, IT, ES.'},
        outbox: {title: 'Outbox + Celery', description: 'Envoi asynchrone fiable avec retry et backoff. SMTP ou Microsoft Graph.'},
        dashboard: {title: 'Tableau de bord', description: 'KPIs et graphiques Chart.js : utilisateurs actifs, domaines, questions, sessions.'},
        diagnostics: {title: 'Diagnostics système', description: 'Snapshot live de la config (DB, email, upload, DeepL) avec checks à la demande.'},
        rateLimit: {title: 'Rate limiting', description: 'Protection des endpoints publics et sensibles via ScopedRateThrottle.'},
        api: {title: 'API OpenAPI', description: 'Schéma drf-spectacular et client TypeScript généré automatiquement.'},
      },
    },
  },
};

const EN_CONTENT: FeaturesContent = {
  eyebrow: 'Platform',
  title: 'Everything you need to build quizzes that matter',
  intro: 'From organisational structure to detailed results, QuizOnline brings content authoring, delivery and follow-up into a single product designed multilingual from the ground up.',
  ctaPrimary: 'Create an account',
  ctaSecondary: 'Sign in',
  ctaLoggedIn: 'View my quizzes',
  sections: {
    domains: {
      badge: 'Domains',
      title: 'Organise your content by domain',
      intro: 'Give each entity its own space, roles and rules. Domains structure the entire platform.',
      features: {
        roles: {title: 'Role hierarchy', description: 'Owner, managers and members, each with permissions tuned to their level.'},
        policies: {title: 'Membership policies', description: 'Three approval modes: automatic, owner-only, or owner-and-managers.'},
        requests: {title: 'Self-service join requests', description: 'Full join workflow with approval, motivated rejection and status tracking.'},
        notifications: {title: 'Email notifications', description: 'Owners and applicants kept informed at every step, in their own language.'},
        multilingual: {title: 'Multilingual by design', description: 'Translatable name and description across five languages: FR, EN, NL, IT, ES.'},
        aiTranslate: {title: 'AI translations', description: 'Pre-fill translations in one click thanks to the DeepL integration.'},
        languageGate: {title: 'Allowed languages', description: 'Restrict authoring languages on a per-domain basis.'},
      },
    },
    subjects: {
      badge: 'Subjects',
      title: 'Categorise with flexibility',
      intro: 'Subjects let you freely organise the topics that matter for each domain.',
      features: {
        crud: {title: 'Full management', description: 'Create, edit and toggle subjects scoped to a single domain.'},
        multilingual: {title: 'Multilingual content', description: 'Translatable name and description in five languages.'},
        aiTranslate: {title: 'DeepL translations', description: 'Auto-generate translations ready for review.'},
        tagging: {title: 'Question linkage', description: 'Multi-subject tagging with custom ordering per subject.'},
        autoCreate: {title: 'Auto-created on import', description: 'Missing subjects appear automatically during question import.'},
      },
    },
    questions: {
      badge: 'Questions',
      title: 'An uncompromised question bank',
      intro: 'From media-rich multiple-choice to teaching-grade explanations, every question speaks all your languages.',
      features: {
        multipleChoice: {title: 'Flexible multiple choice', description: 'Single correct answer or several — you choose, per question.'},
        multilingual: {title: 'Multilingual content', description: 'Title, description, explanation and answer options translated in five languages.'},
        images: {title: 'Embedded images', description: 'Upload with automatic deduplication; illustrate without inflating storage.'},
        videos: {title: 'Hosted video', description: 'Upload video files attached straight to the question.'},
        youtube: {title: 'YouTube ready', description: 'Paste any URL — watch, shorts, embed, youtu.be — it gets normalized for you.'},
        modes: {title: 'Practice or exam', description: 'Enable each question for practice, exam, or both pools.'},
        explanations: {title: 'Detailed explanations', description: 'Rich-text content shown after answering in practice mode.'},
        aiTranslate: {title: 'Batch translations', description: 'DeepL translates title, description, explanation and options in a single call.'},
        importExport: {title: 'Structured import / export', description: 'Versioned JSON and CSV to migrate or archive your question bank.'},
        duplicate: {title: 'Duplication', description: 'Clone an existing question to save time on variants.'},
      },
    },
    quizzes: {
      badge: 'Quizzes',
      title: 'Deliver, time, follow up',
      intro: 'Practice, exam or public assessment: every template combines your mode, duration and visibility rules.',
      features: {
        modes: {title: 'Practice and Exam', description: 'Immediate feedback or single attempt with controlled reveal.'},
        timer: {title: 'Configurable timer', description: 'Per-template duration with server-side automatic expiry.'},
        window: {title: 'Availability window', description: 'Date range, or permanent template — your choice.'},
        visibility: {title: 'Fine-grained visibility', description: 'Score and answer detail: immediate, scheduled, or never.'},
        public: {title: 'Public quizzes', description: 'Allow access without domain membership for open assessments.'},
        assignment: {title: 'Bulk assignment', description: 'Assign a template to many users in a single atomic call.'},
        emails: {title: 'Assignment emails', description: 'Automatic notification with deadline and direct link, in the recipient\'s language.'},
        messages: {title: 'Contextual messaging', description: 'Per-question alert threads — start a conversation during the quiz.'},
        scoring: {title: 'Weighted scoring', description: 'Per-question weight in a template, all-or-nothing on correct options.'},
        pdf: {title: 'PDF export', description: 'A4 result generation with score, per-question detail and explanations.'},
        tracking: {title: 'Session tracking', description: 'Per-template view with completion status per user.'},
      },
    },
    platform: {
      badge: 'Platform',
      title: 'Production-ready infrastructure',
      intro: 'Everything that makes the platform reliable, multilingual and observable, day in and day out.',
      features: {
        auth: {title: 'JWT auth and email confirm', description: 'Secure registration, email confirmation and password reset flows.'},
        multilingual: {title: 'Multilingual UI', description: 'Five languages on the interface: FR, EN, NL, IT, ES.'},
        outbox: {title: 'Outbox + Celery', description: 'Reliable async delivery with retry and backoff. SMTP or Microsoft Graph.'},
        dashboard: {title: 'Admin dashboard', description: 'Chart.js KPIs: active users, domains, questions and sessions.'},
        diagnostics: {title: 'System diagnostics', description: 'Live snapshot of DB, email, upload and DeepL config with on-demand checks.'},
        rateLimit: {title: 'Rate limiting', description: 'Public and sensitive endpoints protected via ScopedRateThrottle.'},
        api: {title: 'OpenAPI client', description: 'drf-spectacular schema with auto-generated TypeScript client.'},
      },
    },
  },
};

const NL_CONTENT: FeaturesContent = {
  eyebrow: 'Platform',
  title: 'Alles om quizzen te bouwen die ertoe doen',
  intro: 'Van organisatorische structuur tot gedetailleerde resultaten: QuizOnline brengt contentcreatie, distributie en opvolging samen in één meertalig platform.',
  ctaPrimary: 'Account maken',
  ctaSecondary: 'Aanmelden',
  ctaLoggedIn: 'Mijn quizzen bekijken',
  sections: {
    domains: {
      badge: 'Domeinen',
      title: 'Organiseer uw content per domein',
      intro: 'Geef elke entiteit haar eigen ruimte, rollen en regels. Domeinen structureren het hele platform.',
      features: {
        roles: {title: 'Rolhiërarchie', description: 'Eigenaar, beheerders en leden met rechten afgestemd op elk niveau.'},
        policies: {title: 'Toetredingsbeleid', description: 'Drie modi: automatisch, alleen eigenaar, of eigenaar en beheerders.'},
        requests: {title: 'Zelfbedieningsverzoeken', description: 'Volledig toetredingsproces met goedkeuring, gemotiveerde afwijzing en statusopvolging.'},
        notifications: {title: 'E-mailmeldingen', description: 'Eigenaars en aanvragers worden geïnformeerd bij elke stap, in hun eigen taal.'},
        multilingual: {title: 'Meertalig vanaf de start', description: 'Naam en beschrijving vertaalbaar in vijf talen: FR, EN, NL, IT, ES.'},
        aiTranslate: {title: 'AI-vertalingen', description: 'Vul vertalingen vooraf in met één klik dankzij de DeepL-integratie.'},
        languageGate: {title: 'Toegestane talen', description: 'Beperk de toegestane bewerkingstalen per domein.'},
      },
    },
    subjects: {
      badge: 'Onderwerpen',
      title: 'Categoriseer met flexibiliteit',
      intro: 'Onderwerpen om de thema\'s van elk domein vrij te organiseren.',
      features: {
        crud: {title: 'Volledig beheer', description: 'Onderwerpen aanmaken, bewerken en activeren binnen elk domein.'},
        multilingual: {title: 'Meertalige content', description: 'Naam en beschrijving vertaalbaar in vijf talen.'},
        aiTranslate: {title: 'DeepL-vertalingen', description: 'Automatisch gegenereerde vertalingen, klaar voor revisie.'},
        tagging: {title: 'Koppeling met vragen', description: 'Multi-onderwerp tagging met aangepaste sortering per onderwerp.'},
        autoCreate: {title: 'Auto-aanmaak bij import', description: 'Ontbrekende onderwerpen verschijnen automatisch tijdens vraag-import.'},
      },
    },
    questions: {
      badge: 'Vragen',
      title: 'Een vragenbank zonder compromissen',
      intro: 'Van mediarijke meerkeuzevragen tot pedagogische uitleg: elke vraag spreekt al uw talen.',
      features: {
        multipleChoice: {title: 'Flexibele meerkeuze', description: 'Één correct antwoord of meerdere — u beslist per vraag.'},
        multilingual: {title: 'Meertalige inhoud', description: 'Titel, beschrijving, uitleg en antwoordopties vertaald in vijf talen.'},
        images: {title: 'Ingebouwde afbeeldingen', description: 'Upload met automatische deduplicatie; illustreer zonder opslag op te blazen.'},
        videos: {title: 'Gehoste video', description: 'Upload videobestanden direct gekoppeld aan de vraag.'},
        youtube: {title: 'YouTube-klaar', description: 'Plak elke URL — watch, shorts, embed, youtu.be — wij normaliseren ze voor u.'},
        modes: {title: 'Practice of examen', description: 'Schakel elke vraag in voor practice, examen of beide pools.'},
        explanations: {title: 'Gedetailleerde uitleg', description: 'Rich-text inhoud die na het antwoorden in practice-modus wordt getoond.'},
        aiTranslate: {title: 'Batch-vertalingen', description: 'DeepL vertaalt titel, beschrijving, uitleg en opties in één oproep.'},
        importExport: {title: 'Gestructureerde import/export', description: 'Versioned JSON en CSV om uw vragenbank te migreren of archiveren.'},
        duplicate: {title: 'Duplicatie', description: 'Kloon een bestaande vraag om tijd te besparen op varianten.'},
      },
    },
    quizzes: {
      badge: 'Quizzen',
      title: 'Verdeel, klok, volg op',
      intro: 'Practice, examen of openbare evaluatie: elke template combineert uw modus-, duur- en zichtbaarheidsregels.',
      features: {
        modes: {title: 'Practice en Exam', description: 'Onmiddellijke feedback of één poging met gecontroleerde onthulling.'},
        timer: {title: 'Configureerbare timer', description: 'Duur per template met automatische server-side vervaldatum.'},
        window: {title: 'Beschikbaarheidsvenster', description: 'Datumbereik of permanent template — uw keuze.'},
        visibility: {title: 'Fijnmazige zichtbaarheid', description: 'Score en antwoorddetails: onmiddellijk, gepland, of nooit.'},
        public: {title: 'Openbare quizzen', description: 'Sta toegang toe zonder domeinlidmaatschap voor open evaluaties.'},
        assignment: {title: 'Bulk-toewijzing', description: 'Wijs een template toe aan meerdere gebruikers in één atomaire oproep.'},
        emails: {title: 'Toewijzingsmails', description: 'Automatische melding met deadline en directe link, in de taal van de ontvanger.'},
        messages: {title: 'Contextuele berichten', description: 'Alert-threads per vraag — start een gesprek tijdens de quiz.'},
        scoring: {title: 'Gewogen scoring', description: 'Gewicht per vraag in een template, alles-of-niets op correcte opties.'},
        pdf: {title: 'PDF-export', description: 'A4-resultaat met score, vraagdetails en uitleg.'},
        tracking: {title: 'Sessie-opvolging', description: 'Per template overzicht met voltooiingsstatus per gebruiker.'},
      },
    },
    platform: {
      badge: 'Platform',
      title: 'Productieklare infrastructuur',
      intro: 'Alles wat het platform betrouwbaar, meertalig en observeerbaar maakt, elke dag opnieuw.',
      features: {
        auth: {title: 'JWT-auth en e-mailbevestiging', description: 'Veilige registratie, e-mailbevestiging en wachtwoordreset.'},
        multilingual: {title: 'Meertalige UI', description: 'Vijf talen aan de interface: FR, EN, NL, IT, ES.'},
        outbox: {title: 'Outbox + Celery', description: 'Betrouwbare async-levering met retry en backoff. SMTP of Microsoft Graph.'},
        dashboard: {title: 'Admin-dashboard', description: 'Chart.js KPIs: actieve gebruikers, domeinen, vragen en sessies.'},
        diagnostics: {title: 'Systeemdiagnose', description: 'Live snapshot van DB, e-mail, upload en DeepL-config met on-demand checks.'},
        rateLimit: {title: 'Rate limiting', description: 'Openbare en gevoelige endpoints beschermd via ScopedRateThrottle.'},
        api: {title: 'OpenAPI-client', description: 'drf-spectacular schema met automatisch gegenereerde TypeScript-client.'},
      },
    },
  },
};

const IT_CONTENT: FeaturesContent = {
  eyebrow: 'Piattaforma',
  title: 'Tutto per creare quiz che contano',
  intro: 'Dalla struttura organizzativa ai risultati dettagliati, QuizOnline unisce creazione di contenuti, distribuzione e monitoraggio in un\'unica piattaforma multilingue.',
  ctaPrimary: 'Crea un account',
  ctaSecondary: 'Accedi',
  ctaLoggedIn: 'Vedi i miei quiz',
  sections: {
    domains: {
      badge: 'Domini',
      title: 'Organizza i contenuti per dominio',
      intro: 'Dai a ogni entità il suo spazio, ruoli e regole. I domini strutturano l\'intera piattaforma.',
      features: {
        roles: {title: 'Gerarchia di ruoli', description: 'Proprietario, gestori e membri con permessi calibrati su ogni livello.'},
        policies: {title: 'Politiche di adesione', description: 'Tre modalità di approvazione: automatica, solo proprietario, o proprietario e gestori.'},
        requests: {title: 'Richieste self-service', description: 'Workflow completo di adesione con approvazione, rifiuto motivato e tracciamento dello stato.'},
        notifications: {title: 'Notifiche email', description: 'Proprietari e richiedenti informati a ogni passaggio, nella propria lingua.'},
        multilingual: {title: 'Multilingue nativo', description: 'Nome e descrizione traducibili in cinque lingue: FR, EN, NL, IT, ES.'},
        aiTranslate: {title: 'Traduzioni AI', description: 'Precompila le traduzioni con un clic grazie all\'integrazione DeepL.'},
        languageGate: {title: 'Lingue consentite', description: 'Limita le lingue di redazione per ogni singolo dominio.'},
      },
    },
    subjects: {
      badge: 'Argomenti',
      title: 'Categorizza con flessibilità',
      intro: 'Gli argomenti permettono di organizzare liberamente le tematiche di ogni dominio.',
      features: {
        crud: {title: 'Gestione completa', description: 'Crea, modifica e attiva argomenti specifici per ogni dominio.'},
        multilingual: {title: 'Contenuti multilingue', description: 'Nome e descrizione traducibili in cinque lingue.'},
        aiTranslate: {title: 'Traduzioni DeepL', description: 'Generazione automatica delle traduzioni, pronta per la revisione.'},
        tagging: {title: 'Collegamento alle domande', description: 'Tagging multi-argomento con ordinamento personalizzabile per argomento.'},
        autoCreate: {title: 'Auto-creazione all\'import', description: 'Gli argomenti mancanti vengono creati automaticamente durante l\'import.'},
      },
    },
    questions: {
      badge: 'Domande',
      title: 'Una banca dati senza compromessi',
      intro: 'Dalle domande a scelta multipla ricche di media alle spiegazioni didattiche, ogni domanda parla tutte le tue lingue.',
      features: {
        multipleChoice: {title: 'Scelta multipla flessibile', description: 'Una sola risposta corretta o più: decidi tu, per ogni domanda.'},
        multilingual: {title: 'Contenuto multilingue', description: 'Titolo, descrizione, spiegazione e opzioni di risposta tradotti in cinque lingue.'},
        images: {title: 'Immagini integrate', description: 'Upload con deduplicazione automatica: illustra senza gonfiare lo storage.'},
        videos: {title: 'Video ospitati', description: 'Upload di file video direttamente collegati alla domanda.'},
        youtube: {title: 'YouTube pronto all\'uso', description: 'Incolla qualsiasi URL — watch, shorts, embed, youtu.be — viene normalizzato.'},
        modes: {title: 'Practice o esame', description: 'Attiva ogni domanda per practice, esame, o entrambi i pool.'},
        explanations: {title: 'Spiegazioni dettagliate', description: 'Testo ricco mostrato dopo la risposta in modalità practice.'},
        aiTranslate: {title: 'Traduzioni in batch', description: 'DeepL traduce titolo, descrizione, spiegazione e opzioni in un\'unica chiamata.'},
        importExport: {title: 'Import / Export strutturati', description: 'JSON versionato e CSV per migrare o archiviare la banca dati.'},
        duplicate: {title: 'Duplicazione', description: 'Clona una domanda esistente per risparmiare tempo sulle varianti.'},
      },
    },
    quizzes: {
      badge: 'Quiz',
      title: 'Distribuisci, cronometra, monitora',
      intro: 'Practice, esame o valutazione pubblica: ogni template combina le tue regole di modalità, durata e visibilità.',
      features: {
        modes: {title: 'Practice ed Exam', description: 'Feedback immediato o tentativo unico con rivelazione controllata.'},
        timer: {title: 'Timer configurabile', description: 'Durata per template con scadenza automatica lato server.'},
        window: {title: 'Finestra di disponibilità', description: 'Intervallo di date o template permanente — a tua scelta.'},
        visibility: {title: 'Visibilità granulare', description: 'Punteggio e dettaglio risposte: immediato, programmato, o mai.'},
        public: {title: 'Quiz pubblici', description: 'Permetti l\'accesso senza appartenenza al dominio per valutazioni aperte.'},
        assignment: {title: 'Assegnazione in massa', description: 'Assegna un template a più utenti in una singola chiamata atomica.'},
        emails: {title: 'Email di assegnazione', description: 'Notifica automatica con scadenza e link diretto, nella lingua del destinatario.'},
        messages: {title: 'Messaggistica contestuale', description: 'Thread di alert per domanda: avvia una conversazione durante il quiz.'},
        scoring: {title: 'Punteggio ponderato', description: 'Peso per domanda nel template, valutazione tutto-o-niente sulle opzioni corrette.'},
        pdf: {title: 'Export PDF', description: 'Generazione A4 del risultato con punteggio, dettagli per domanda e spiegazioni.'},
        tracking: {title: 'Monitoraggio sessioni', description: 'Vista per template con stato di completamento per utente.'},
      },
    },
    platform: {
      badge: 'Piattaforma',
      title: 'Un\'infrastruttura pronta per la produzione',
      intro: 'Tutto ciò che rende la piattaforma affidabile, multilingue e osservabile ogni giorno.',
      features: {
        auth: {title: 'Auth JWT e conferma email', description: 'Registrazione, conferma email e reset password sicuri.'},
        multilingual: {title: 'UI multilingue', description: 'Cinque lingue sull\'interfaccia: FR, EN, NL, IT, ES.'},
        outbox: {title: 'Outbox + Celery', description: 'Consegna asincrona affidabile con retry e backoff. SMTP o Microsoft Graph.'},
        dashboard: {title: 'Dashboard admin', description: 'KPI Chart.js: utenti attivi, domini, domande e sessioni.'},
        diagnostics: {title: 'Diagnostica di sistema', description: 'Snapshot live di DB, email, upload e DeepL con check on-demand.'},
        rateLimit: {title: 'Rate limiting', description: 'Endpoint pubblici e sensibili protetti tramite ScopedRateThrottle.'},
        api: {title: 'Client OpenAPI', description: 'Schema drf-spectacular con client TypeScript generato automaticamente.'},
      },
    },
  },
};

const ES_CONTENT: FeaturesContent = {
  eyebrow: 'Plataforma',
  title: 'Todo para diseñar cuestionarios que importan',
  intro: 'De la estructura organizativa a los resultados detallados, QuizOnline reúne la creación de contenido, la distribución y el seguimiento en un solo producto pensado multilingüe.',
  ctaPrimary: 'Crear una cuenta',
  ctaSecondary: 'Iniciar sesión',
  ctaLoggedIn: 'Ver mis cuestionarios',
  sections: {
    domains: {
      badge: 'Dominios',
      title: 'Organiza tu contenido por dominio',
      intro: 'Da a cada entidad su propio espacio, roles y reglas. Los dominios estructuran toda la plataforma.',
      features: {
        roles: {title: 'Jerarquía de roles', description: 'Propietario, gestores y miembros con permisos ajustados a cada nivel.'},
        policies: {title: 'Políticas de adhesión', description: 'Tres modos de aprobación: automático, solo propietario, o propietario y gestores.'},
        requests: {title: 'Solicitudes en autoservicio', description: 'Flujo completo con aprobación, rechazo motivado y seguimiento de estado.'},
        notifications: {title: 'Notificaciones por email', description: 'Propietarios y solicitantes informados en cada paso, en su propio idioma.'},
        multilingual: {title: 'Multilingüe de origen', description: 'Nombre y descripción traducibles en cinco idiomas: FR, EN, NL, IT, ES.'},
        aiTranslate: {title: 'Traducciones IA', description: 'Pre-rellena las traducciones con un clic gracias a la integración DeepL.'},
        languageGate: {title: 'Idiomas permitidos', description: 'Restringe los idiomas de edición por dominio.'},
      },
    },
    subjects: {
      badge: 'Temas',
      title: 'Categoriza con flexibilidad',
      intro: 'Los temas permiten organizar libremente las temáticas de cada dominio.',
      features: {
        crud: {title: 'Gestión completa', description: 'Crea, edita y activa temas específicos de cada dominio.'},
        multilingual: {title: 'Contenido multilingüe', description: 'Nombre y descripción traducibles en cinco idiomas.'},
        aiTranslate: {title: 'Traducciones DeepL', description: 'Generación automática de traducciones, lista para revisar.'},
        tagging: {title: 'Vinculación con preguntas', description: 'Etiquetado multi-tema con orden personalizable por tema.'},
        autoCreate: {title: 'Auto-creación al importar', description: 'Los temas faltantes se crean automáticamente al importar preguntas.'},
      },
    },
    questions: {
      badge: 'Preguntas',
      title: 'Un banco de preguntas sin compromisos',
      intro: 'De la opción múltiple enriquecida con medios a las explicaciones pedagógicas, cada pregunta habla todos tus idiomas.',
      features: {
        multipleChoice: {title: 'Opción múltiple flexible', description: 'Una sola respuesta correcta o varias: tú decides, por pregunta.'},
        multilingual: {title: 'Contenido multilingüe', description: 'Título, descripción, explicación y opciones traducidos en cinco idiomas.'},
        images: {title: 'Imágenes integradas', description: 'Subida con deduplicación automática: ilustra sin inflar el almacenamiento.'},
        videos: {title: 'Vídeos alojados', description: 'Sube archivos de vídeo directamente vinculados a la pregunta.'},
        youtube: {title: 'YouTube listo', description: 'Pega cualquier URL — watch, shorts, embed, youtu.be — la normalizamos.'},
        modes: {title: 'Practice o examen', description: 'Activa cada pregunta para practice, examen, o ambos pools.'},
        explanations: {title: 'Explicaciones detalladas', description: 'Texto enriquecido mostrado tras la respuesta en modo practice.'},
        aiTranslate: {title: 'Traducciones por lotes', description: 'DeepL traduce título, descripción, explicación y opciones en una sola llamada.'},
        importExport: {title: 'Import / Export estructurados', description: 'JSON versionado y CSV para migrar o archivar tu banco.'},
        duplicate: {title: 'Duplicación', description: 'Clona una pregunta existente para ahorrar tiempo en variantes.'},
      },
    },
    quizzes: {
      badge: 'Cuestionarios',
      title: 'Distribuye, cronometra, sigue',
      intro: 'Practice, examen o evaluación pública: cada plantilla combina tus reglas de modo, duración y visibilidad.',
      features: {
        modes: {title: 'Practice y Exam', description: 'Feedback inmediato o intento único con revelación controlada.'},
        timer: {title: 'Temporizador configurable', description: 'Duración por plantilla con expiración automática del lado servidor.'},
        window: {title: 'Ventana de disponibilidad', description: 'Rango de fechas o plantilla permanente — a tu elección.'},
        visibility: {title: 'Visibilidad granular', description: 'Puntuación y detalle de respuestas: inmediato, programado, o nunca.'},
        public: {title: 'Cuestionarios públicos', description: 'Permite el acceso sin pertenencia al dominio para evaluaciones abiertas.'},
        assignment: {title: 'Asignación masiva', description: 'Asigna una plantilla a varios usuarios en una sola llamada atómica.'},
        emails: {title: 'Emails de asignación', description: 'Notificación automática con plazo y enlace directo, en el idioma del destinatario.'},
        messages: {title: 'Mensajería contextual', description: 'Hilos de alerta por pregunta: inicia una conversación durante el cuestionario.'},
        scoring: {title: 'Puntuación ponderada', description: 'Peso por pregunta en la plantilla, evaluación todo-o-nada en opciones correctas.'},
        pdf: {title: 'Export PDF', description: 'Generación A4 del resultado con puntuación, detalles por pregunta y explicaciones.'},
        tracking: {title: 'Seguimiento de sesiones', description: 'Vista por plantilla con estado de finalización por usuario.'},
      },
    },
    platform: {
      badge: 'Plataforma',
      title: 'Una infraestructura lista para producción',
      intro: 'Todo lo que hace la plataforma fiable, multilingüe y observable cada día.',
      features: {
        auth: {title: 'Auth JWT y confirmación email', description: 'Registro, confirmación de email y restablecimiento de contraseña seguros.'},
        multilingual: {title: 'UI multilingüe', description: 'Cinco idiomas en la interfaz: FR, EN, NL, IT, ES.'},
        outbox: {title: 'Outbox + Celery', description: 'Entrega asíncrona fiable con retry y backoff. SMTP o Microsoft Graph.'},
        dashboard: {title: 'Panel de admin', description: 'KPIs Chart.js: usuarios activos, dominios, preguntas y sesiones.'},
        diagnostics: {title: 'Diagnóstico del sistema', description: 'Snapshot en vivo de DB, email, upload y DeepL con checks bajo demanda.'},
        rateLimit: {title: 'Rate limiting', description: 'Endpoints públicos y sensibles protegidos vía ScopedRateThrottle.'},
        api: {title: 'Cliente OpenAPI', description: 'Esquema drf-spectacular con cliente TypeScript generado automáticamente.'},
      },
    },
  },
};

function buildUiText(content: FeaturesContent): FeaturesUiText {
  return {
    eyebrow: content.eyebrow,
    title: content.title,
    intro: content.intro,
    ctaPrimary: content.ctaPrimary,
    ctaSecondary: content.ctaSecondary,
    ctaLoggedIn: content.ctaLoggedIn,
    sections: SECTION_DEFS.map((def) => {
      const sec = content.sections[def.slug];
      return {
        slug: def.slug,
        icon: def.icon,
        badge: sec.badge,
        title: sec.title,
        intro: sec.intro,
        features: def.features.map((f) => {
          const featureContent = sec.features[f.key];
          return {
            icon: f.icon,
            title: featureContent.title,
            description: featureContent.description,
          };
        }),
      };
    }),
  };
}

const CONTENT_BY_LANG: Partial<Record<LanguageEnumDto, FeaturesContent>> = {
  [LanguageEnumDto.Fr]: FR_CONTENT,
  [LanguageEnumDto.En]: EN_CONTENT,
  [LanguageEnumDto.Nl]: NL_CONTENT,
  [LanguageEnumDto.It]: IT_CONTENT,
  [LanguageEnumDto.Es]: ES_CONTENT,
};

export function getFeaturesUiText(lang: LanguageEnumDto | string | null | undefined): FeaturesUiText {
  return buildUiText(CONTENT_BY_LANG[lang as LanguageEnumDto] ?? EN_CONTENT);
}
