import {LanguageEnumDto} from '../../../../../api/generated/model/language-enum';

/**
 * Per-tab dictionary for the course-edit "Analytics" tab. KPIs are
 * aggregated client-side from the enrollment list endpoint (see
 * :class:`LmsCourseEditAnalyticsTab`); this dictionary owns every
 * visible string surfaced by that panel — labels, hints, error /
 * empty states.
 *
 * Five languages (FR/EN/NL/IT/ES) are mandatory; the i18n
 * completeness check (``scripts/check-i18n.ts``) fails the build
 * otherwise.
 */
export interface LmsCourseEditAnalyticsTabUiText {
  heading: string;
  subtitle: string;
  kpi: {
    total: string;
    active: string;
    pending: string;
    completed: string;
    cancelled: string;
    completionRate: string;
    lastEnrollment: string;
    lastCompletion: string;
  };
  kpiHints: {
    pctOfTotal: (pct: number) => string;
    neverYet: string;
  };
  errors: {
    loadFailed: string;
  };
  retryButton: string;
  emptyTitle: string;
  emptyMessage: string;
}

export function getLmsCourseEditAnalyticsTabUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsCourseEditAnalyticsTabUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        heading: 'Analyses',
        subtitle:
          'Indicateurs d’inscription agrégés à partir des inscriptions de ce cours.',
        kpi: {
          total: 'Inscriptions totales',
          active: 'Actives',
          pending: 'En attente',
          completed: 'Terminées',
          cancelled: 'Annulées',
          completionRate: 'Taux de réussite',
          lastEnrollment: 'Dernière inscription',
          lastCompletion: 'Dernière complétion',
        },
        kpiHints: {
          pctOfTotal: (pct) => `${pct} % du total`,
          neverYet: '—',
        },
        errors: {
          loadFailed: 'Impossible de charger les analyses.',
        },
        retryButton: 'Réessayer',
        emptyTitle: 'Aucune inscription pour le moment',
        emptyMessage:
          'Les statistiques apparaîtront dès que des apprenants s’inscriront à ce cours.',
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        heading: 'Analyses',
        subtitle:
          'Inschrijvingsindicatoren samengevat op basis van de inschrijvingen van deze cursus.',
        kpi: {
          total: 'Totaal inschrijvingen',
          active: 'Actief',
          pending: 'In afwachting',
          completed: 'Voltooid',
          cancelled: 'Geannuleerd',
          completionRate: 'Voltooiingspercentage',
          lastEnrollment: 'Laatste inschrijving',
          lastCompletion: 'Laatste voltooiing',
        },
        kpiHints: {
          pctOfTotal: (pct) => `${pct} % van het totaal`,
          neverYet: '—',
        },
        errors: {
          loadFailed: 'Analyses konden niet worden geladen.',
        },
        retryButton: 'Opnieuw proberen',
        emptyTitle: 'Nog geen inschrijvingen',
        emptyMessage:
          'Statistieken verschijnen zodra cursisten zich voor deze cursus inschrijven.',
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        heading: 'Analisi',
        subtitle:
          'Indicatori di iscrizione aggregati dalle iscrizioni di questo corso.',
        kpi: {
          total: 'Iscrizioni totali',
          active: 'Attive',
          pending: 'In attesa',
          completed: 'Completate',
          cancelled: 'Annullate',
          completionRate: 'Tasso di completamento',
          lastEnrollment: 'Ultima iscrizione',
          lastCompletion: 'Ultimo completamento',
        },
        kpiHints: {
          pctOfTotal: (pct) => `${pct} % del totale`,
          neverYet: '—',
        },
        errors: {
          loadFailed: 'Impossibile caricare le analisi.',
        },
        retryButton: 'Riprova',
        emptyTitle: 'Nessuna iscrizione al momento',
        emptyMessage:
          'Le statistiche appariranno non appena alcuni studenti si iscriveranno a questo corso.',
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        heading: 'Analíticas',
        subtitle:
          'Indicadores de inscripción agregados a partir de las inscripciones de este curso.',
        kpi: {
          total: 'Inscripciones totales',
          active: 'Activas',
          pending: 'Pendientes',
          completed: 'Completadas',
          cancelled: 'Canceladas',
          completionRate: 'Tasa de finalización',
          lastEnrollment: 'Última inscripción',
          lastCompletion: 'Última finalización',
        },
        kpiHints: {
          pctOfTotal: (pct) => `${pct} % del total`,
          neverYet: '—',
        },
        errors: {
          loadFailed: 'No se pudieron cargar las analíticas.',
        },
        retryButton: 'Reintentar',
        emptyTitle: 'Aún no hay inscripciones',
        emptyMessage:
          'Las estadísticas aparecerán en cuanto los estudiantes se inscriban en este curso.',
      };
    default:
      return {
        heading: 'Analytics',
        subtitle: 'Enrollment KPIs aggregated from this course’s enrollments.',
        kpi: {
          total: 'Total enrollments',
          active: 'Active',
          pending: 'Pending',
          completed: 'Completed',
          cancelled: 'Cancelled',
          completionRate: 'Completion rate',
          lastEnrollment: 'Last enrollment',
          lastCompletion: 'Last completion',
        },
        kpiHints: {
          pctOfTotal: (pct) => `${pct}% of total`,
          neverYet: '—',
        },
        errors: {
          loadFailed: 'Could not load analytics.',
        },
        retryButton: 'Retry',
        emptyTitle: 'No enrollments yet',
        emptyMessage:
          'Stats will appear here as soon as learners enroll in this course.',
      };
  }
}
