import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export interface CourseReviewsUiText {
  heading: string;
  noReviews: string;
  reviewsCount: string; // "{count} avis"
  ratingCount: string; // "{count} notes"
  yourReview: string;
  writeReview: string;
  editReview: string;
  ratingLabel: string;
  commentLabel: string;
  commentPlaceholder: string;
  submit: string;
  delete: string;
  hide: string;
  unhide: string;
  hiddenBadge: string;
  savedToast: string;
  errorToast: string;
  onlyCompleted: string; // hint when the learner hasn't completed
}

export function getCourseReviewsUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CourseReviewsUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        heading: 'Avis',
        noReviews: 'Aucun avis pour le moment.',
        reviewsCount: '{count} avis',
        ratingCount: '{count} notes',
        yourReview: 'Votre avis',
        writeReview: 'Donner mon avis',
        editReview: 'Modifier mon avis',
        ratingLabel: 'Note',
        commentLabel: 'Commentaire',
        commentPlaceholder: 'Partagez votre expérience…',
        submit: 'Publier',
        delete: 'Supprimer',
        hide: 'Masquer',
        unhide: 'Réafficher',
        hiddenBadge: 'Masqué',
        savedToast: 'Avis enregistré.',
        errorToast: "Impossible d'enregistrer l'avis.",
        onlyCompleted: 'Terminez le cours pour laisser un avis.',
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        heading: 'Beoordelingen', noReviews: 'Nog geen beoordelingen.',
        reviewsCount: '{count} beoordelingen', ratingCount: '{count} scores',
        yourReview: 'Jouw beoordeling', writeReview: 'Beoordeling geven',
        editReview: 'Beoordeling bewerken', ratingLabel: 'Score', commentLabel: 'Opmerking',
        commentPlaceholder: 'Deel je ervaring…', submit: 'Publiceren', delete: 'Verwijderen',
        hide: 'Verbergen', unhide: 'Weer tonen', hiddenBadge: 'Verborgen',
        savedToast: 'Beoordeling opgeslagen.', errorToast: 'Opslaan mislukt.',
        onlyCompleted: 'Rond de cursus af om een beoordeling te geven.',
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        heading: 'Recensioni', noReviews: 'Ancora nessuna recensione.',
        reviewsCount: '{count} recensioni', ratingCount: '{count} voti',
        yourReview: 'La tua recensione', writeReview: 'Lascia una recensione',
        editReview: 'Modifica la recensione', ratingLabel: 'Voto', commentLabel: 'Commento',
        commentPlaceholder: 'Condividi la tua esperienza…', submit: 'Pubblica', delete: 'Elimina',
        hide: 'Nascondi', unhide: 'Mostra', hiddenBadge: 'Nascosta',
        savedToast: 'Recensione salvata.', errorToast: 'Impossibile salvare la recensione.',
        onlyCompleted: 'Completa il corso per lasciare una recensione.',
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        heading: 'Reseñas', noReviews: 'Aún no hay reseñas.',
        reviewsCount: '{count} reseñas', ratingCount: '{count} valoraciones',
        yourReview: 'Tu reseña', writeReview: 'Dejar una reseña',
        editReview: 'Editar mi reseña', ratingLabel: 'Valoración', commentLabel: 'Comentario',
        commentPlaceholder: 'Comparte tu experiencia…', submit: 'Publicar', delete: 'Eliminar',
        hide: 'Ocultar', unhide: 'Mostrar', hiddenBadge: 'Oculta',
        savedToast: 'Reseña guardada.', errorToast: 'No se pudo guardar la reseña.',
        onlyCompleted: 'Completa el curso para dejar una reseña.',
      };
    default:
      return {
        heading: 'Reviews', noReviews: 'No reviews yet.',
        reviewsCount: '{count} reviews', ratingCount: '{count} ratings',
        yourReview: 'Your review', writeReview: 'Write a review',
        editReview: 'Edit my review', ratingLabel: 'Rating', commentLabel: 'Comment',
        commentPlaceholder: 'Share your experience…', submit: 'Publish', delete: 'Delete',
        hide: 'Hide', unhide: 'Unhide', hiddenBadge: 'Hidden',
        savedToast: 'Review saved.', errorToast: 'Could not save the review.',
        onlyCompleted: 'Complete the course to leave a review.',
      };
  }
}
