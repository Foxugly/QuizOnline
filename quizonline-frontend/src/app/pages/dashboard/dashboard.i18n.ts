import {LanguageEnumDto} from '../../api/generated/model/language-enum';

/**
 * UI strings for the unified post-login dashboard. The page surfaces
 * counts pulled from the LMS enrollment / certificate / quiz session
 * endpoints, so every tile carries:
 * - a title (eg. "Courses in progress"),
 * - an empty-state hint when the user has zero items,
 * - a primary CTA leading to the matching list page.
 */
export interface DashboardUiText {
  pageTitle: string;
  pageSubtitle: string;
  tiles: {
    courses: {
      title: string;
      empty: string;
      cta: string;
      progressLabel: (pct: number) => string;
    };
    certificates: {
      title: string;
      empty: string;
      count: (n: number) => string;
      cta: string;
    };
    quizzes: {
      title: string;
      empty: string;
      cta: string;
    };
    catalog: {
      title: string;
      subtitle: string;
      cta: string;
    };
    invitations: {
      title: string;
      empty: string;
      cta: string;
      inviterLine: (inviter: string) => string;
    };
  };
}

export function getDashboardUiText(
  lang: LanguageEnumDto | string | null | undefined,
): DashboardUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        pageTitle: 'Tableau de bord',
        pageSubtitle: 'Vos cours, vos quiz et vos certificats au même endroit.',
        tiles: {
          courses: {
            title: 'Mes cours en cours',
            empty: "Vous n'êtes inscrit à aucun cours pour le moment.",
            cta: 'Voir ma progression',
            progressLabel: (pct) => `${pct} %`,
          },
          certificates: {
            title: 'Mes certificats',
            empty: 'Aucun certificat émis pour le moment.',
            count: (n) => `${n} certificat${n > 1 ? 's' : ''}`,
            cta: 'Voir mes certificats',
          },
          quizzes: {
            title: 'Mes quiz',
            empty: 'Aucun quiz en cours ou récent.',
            cta: 'Voir mes quiz',
          },
          catalog: {
            title: 'Catalogue',
            subtitle: 'Parcourez les cours disponibles dans vos domaines.',
            cta: 'Parcourir le catalogue',
          },
          invitations: {
            title: 'Invitations en attente',
            empty: 'Aucune invitation à un cours en attente.',
            cta: 'Voir mes invitations',
            inviterLine: (inviter) => `Invité·e par ${inviter}`,
          },
        },
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        pageTitle: 'Dashboard',
        pageSubtitle: 'Je cursussen, quizzen en certificaten op één plek.',
        tiles: {
          courses: {
            title: 'Cursussen in uitvoering',
            empty: 'Je bent op dit moment niet ingeschreven voor een cursus.',
            cta: 'Mijn voortgang bekijken',
            progressLabel: (pct) => `${pct} %`,
          },
          certificates: {
            title: 'Mijn certificaten',
            empty: 'Nog geen certificaten uitgegeven.',
            count: (n) => `${n} certifica${n > 1 ? 'ten' : 'at'}`,
            cta: 'Mijn certificaten bekijken',
          },
          quizzes: {
            title: 'Mijn quizzen',
            empty: 'Geen quiz in uitvoering of recent.',
            cta: 'Mijn quizzen bekijken',
          },
          catalog: {
            title: 'Catalogus',
            subtitle: 'Blader door de cursussen in jouw domeinen.',
            cta: 'Door catalogus bladeren',
          },
          invitations: {
            title: 'Lopende uitnodigingen',
            empty: 'Geen lopende cursusuitnodigingen.',
            cta: 'Mijn uitnodigingen bekijken',
            inviterLine: (inviter) => `Uitgenodigd door ${inviter}`,
          },
        },
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        pageTitle: 'Cruscotto',
        pageSubtitle: 'I tuoi corsi, quiz e certificati in un unico posto.',
        tiles: {
          courses: {
            title: 'Corsi in corso',
            empty: 'Non sei iscritto a nessun corso al momento.',
            cta: 'Vedi i miei progressi',
            progressLabel: (pct) => `${pct} %`,
          },
          certificates: {
            title: 'I miei certificati',
            empty: 'Nessun certificato emesso al momento.',
            count: (n) => `${n} certificat${n > 1 ? 'i' : 'o'}`,
            cta: 'Vedi i miei certificati',
          },
          quizzes: {
            title: 'I miei quiz',
            empty: 'Nessun quiz in corso o recente.',
            cta: 'Vedi i miei quiz',
          },
          catalog: {
            title: 'Catalogo',
            subtitle: 'Esplora i corsi disponibili nei tuoi domini.',
            cta: 'Sfoglia il catalogo',
          },
          invitations: {
            title: 'Inviti in attesa',
            empty: 'Nessun invito a un corso in attesa.',
            cta: 'Vedi i miei inviti',
            inviterLine: (inviter) => `Invitato da ${inviter}`,
          },
        },
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        pageTitle: 'Panel',
        pageSubtitle: 'Tus cursos, cuestionarios y certificados en un solo lugar.',
        tiles: {
          courses: {
            title: 'Cursos en curso',
            empty: 'No estás inscrito en ningún curso por ahora.',
            cta: 'Ver mi progreso',
            progressLabel: (pct) => `${pct} %`,
          },
          certificates: {
            title: 'Mis certificados',
            empty: 'Sin certificados emitidos por ahora.',
            count: (n) => `${n} certificado${n > 1 ? 's' : ''}`,
            cta: 'Ver mis certificados',
          },
          quizzes: {
            title: 'Mis cuestionarios',
            empty: 'Sin cuestionarios recientes o en curso.',
            cta: 'Ver mis cuestionarios',
          },
          catalog: {
            title: 'Catálogo',
            subtitle: 'Explora los cursos disponibles en tus dominios.',
            cta: 'Explorar el catálogo',
          },
          invitations: {
            title: 'Invitaciones pendientes',
            empty: 'No tienes invitaciones a cursos pendientes.',
            cta: 'Ver mis invitaciones',
            inviterLine: (inviter) => `Invitado por ${inviter}`,
          },
        },
      };
    default:
      return {
        pageTitle: 'Dashboard',
        pageSubtitle: 'Your courses, quizzes and certificates in one place.',
        tiles: {
          courses: {
            title: 'Courses in progress',
            empty: 'You are not enrolled in any course yet.',
            cta: 'View my progress',
            progressLabel: (pct) => `${pct}%`,
          },
          certificates: {
            title: 'My certificates',
            empty: 'No certificates issued yet.',
            count: (n) => `${n} certificate${n > 1 ? 's' : ''}`,
            cta: 'View my certificates',
          },
          quizzes: {
            title: 'My quizzes',
            empty: 'No quiz in progress or recent.',
            cta: 'View my quizzes',
          },
          catalog: {
            title: 'Catalog',
            subtitle: 'Browse the courses available in your domains.',
            cta: 'Browse the catalog',
          },
          invitations: {
            title: 'Pending invitations',
            empty: 'No pending course invitations.',
            cta: 'View my invitations',
            inviterLine: (inviter) => `Invited by ${inviter}`,
          },
        },
      };
  }
}
