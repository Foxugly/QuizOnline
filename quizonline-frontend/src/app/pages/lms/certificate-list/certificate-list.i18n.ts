import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

/**
 * Per-language UI text for the "My certificates" page.
 *
 * Renders every active certificate the caller owns. The localized
 * course title comes from the backend (slug fallback applied
 * server-side), so no client-side fallback string is needed.
 */
export interface LmsCertificateListUiText {
  pageTitle: string;
  colNumber: string;
  colCourse: string;
  colIssuedAt: string;
  colActions: string;
  downloadButton: string;
  viewButton: string;
  emptyTitle: string;
  emptyMessage: string;
  exploreButton: string;
}

export function getLmsCertificateListUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsCertificateListUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        pageTitle: 'Mes certificats',
        colNumber: 'Numéro',
        colCourse: 'Cours',
        colIssuedAt: 'Émis le',
        colActions: 'Actions',
        downloadButton: 'Télécharger',
        viewButton: 'Voir',
        emptyTitle: 'Aucun certificat',
        emptyMessage: 'Terminez un cours pour recevoir votre premier certificat.',
        exploreButton: 'Parcourir le catalogue',
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        pageTitle: 'Mijn certificaten',
        colNumber: 'Nummer',
        colCourse: 'Cursus',
        colIssuedAt: 'Uitgegeven op',
        colActions: 'Acties',
        downloadButton: 'Downloaden',
        viewButton: 'Bekijken',
        emptyTitle: 'Geen certificaten',
        emptyMessage: 'Voltooi een cursus om je eerste certificaat te ontvangen.',
        exploreButton: 'Door catalogus bladeren',
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        pageTitle: 'I miei certificati',
        colNumber: 'Numero',
        colCourse: 'Corso',
        colIssuedAt: 'Emesso il',
        colActions: 'Azioni',
        downloadButton: 'Scarica',
        viewButton: 'Visualizza',
        emptyTitle: 'Nessun certificato',
        emptyMessage: 'Completa un corso per ricevere il tuo primo certificato.',
        exploreButton: 'Sfoglia il catalogo',
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        pageTitle: 'Mis certificados',
        colNumber: 'Número',
        colCourse: 'Curso',
        colIssuedAt: 'Emitido el',
        colActions: 'Acciones',
        downloadButton: 'Descargar',
        viewButton: 'Ver',
        emptyTitle: 'Sin certificados',
        emptyMessage: 'Completa un curso para recibir tu primer certificado.',
        exploreButton: 'Explorar catálogo',
      };
    default:
      return {
        pageTitle: 'My certificates',
        colNumber: 'Number',
        colCourse: 'Course',
        colIssuedAt: 'Issued on',
        colActions: 'Actions',
        downloadButton: 'Download',
        viewButton: 'View',
        emptyTitle: 'No certificates yet',
        emptyMessage: 'Complete a course to earn your first certificate.',
        exploreButton: 'Browse catalog',
      };
  }
}
