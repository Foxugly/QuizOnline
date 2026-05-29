import {LanguageEnumDto} from '../../api/generated/model/language-enum';

/**
 * Page-scoped labels for the rewritten question editor form
 * (Phase 3.5 of the LMS refactor). The form now hosts three top-level
 * tabs — Question prompt / Answers / Explanation — each of which
 * embeds a multilingual ``<app-block-list-editor>``. These strings
 * cover the tab headers, the answer-row affordances, the language
 * sub-tabs and the translate button.
 */
export interface QuestionEditorFormUiText {
  /** Heading of the prompt blocks tab. */
  tabQuestion: string;
  /** Heading of the answers tab. */
  tabAnswers: string;
  /** Heading of the explanation blocks tab. */
  tabExplanation: string;
  /** "Translate from current tab" button label. */
  translateButton: string;
  /** Toast summary after a translate run. */
  translateSuccessToast: string;
  /** Toast summary when translation fails. */
  translateErrorToast: string;
  /** "Add an answer" CTA below the answer list. */
  addAnswer: string;
  /** Inline label of the per-answer "is_correct" checkbox. */
  correctAnswer: string;
  /** Tooltip / aria label on the "remove answer" trash button. */
  removeAnswer: string;
  /** Confirmation prompt before deleting an answer. */
  confirmRemoveAnswer: string;
  /** Header rendered above the prompt blocks list. */
  promptHeading: string;
  /** Header rendered above the explanation blocks list. */
  explanationHeading: string;
  /** Header rendered above the answers list. */
  answersHeading: string;
  /** Subtitle below the answers heading hint. */
  answersHint: string;
  /** Subtitle for the prompt blocks tab. */
  promptHint: string;
  /** Subtitle for the explanation blocks tab. */
  explanationHint: string;
  /** Empty state when no answers have been added yet. */
  noAnswersYet: string;
  /** Empty state when the question's domain has no allowed languages. */
  noActiveLanguages: string;
  /** Heading of a single answer card ("Answer 1", "Answer 2", …). */
  answerHeading: (index: number) => string;
}

export function getQuestionEditorFormUiText(
  lang: LanguageEnumDto | string | null | undefined,
): QuestionEditorFormUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        tabQuestion: 'Question',
        tabAnswers: 'Réponses',
        tabExplanation: 'Explication',
        translateButton: 'Traduire depuis l’onglet courant',
        translateSuccessToast: 'Traduction appliquée.',
        translateErrorToast: 'Échec de la traduction automatique.',
        addAnswer: 'Ajouter une réponse',
        correctAnswer: 'Réponse correcte',
        removeAnswer: 'Supprimer la réponse',
        confirmRemoveAnswer: 'Supprimer cette réponse ?',
        promptHeading: 'Énoncé de la question',
        explanationHeading: 'Explication',
        answersHeading: 'Réponses possibles',
        answersHint: 'Coche au moins une réponse correcte. Chaque réponse héberge sa propre liste de blocs.',
        promptHint: 'Compose l’énoncé avec autant de blocs que nécessaire (texte enrichi, image, vidéo, code, ...).',
        explanationHint: 'Affiche cette explication après la réponse de l’apprenant.',
        noAnswersYet: 'Aucune réponse pour l’instant. Ajoutez-en une avec le bouton ci-dessous.',
        noActiveLanguages: 'Ce domaine n’a aucune langue active configurée.',
        answerHeading: (index) => `Réponse ${index}`,
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        tabQuestion: 'Vraag',
        tabAnswers: 'Antwoorden',
        tabExplanation: 'Uitleg',
        translateButton: 'Vertaal vanuit het huidige tabblad',
        translateSuccessToast: 'Vertaling toegepast.',
        translateErrorToast: 'Automatische vertaling mislukt.',
        addAnswer: 'Antwoord toevoegen',
        correctAnswer: 'Correct antwoord',
        removeAnswer: 'Antwoord verwijderen',
        confirmRemoveAnswer: 'Dit antwoord verwijderen?',
        promptHeading: 'Vraagstelling',
        explanationHeading: 'Uitleg',
        answersHeading: 'Mogelijke antwoorden',
        answersHint: 'Vink minstens één correct antwoord aan. Elk antwoord heeft zijn eigen blokken-lijst.',
        promptHint: 'Stel de vraag samen met evenveel blokken als nodig (rijke tekst, beeld, video, code, ...).',
        explanationHint: 'Wordt na het antwoord van de leerling getoond.',
        noAnswersYet: 'Nog geen antwoorden. Voeg er een toe met de knop hieronder.',
        noActiveLanguages: 'Dit domein heeft geen actieve talen geconfigureerd.',
        answerHeading: (index) => `Antwoord ${index}`,
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        tabQuestion: 'Domanda',
        tabAnswers: 'Risposte',
        tabExplanation: 'Spiegazione',
        translateButton: 'Traduci dalla scheda corrente',
        translateSuccessToast: 'Traduzione applicata.',
        translateErrorToast: 'Traduzione automatica non riuscita.',
        addAnswer: 'Aggiungi una risposta',
        correctAnswer: 'Risposta corretta',
        removeAnswer: 'Rimuovi risposta',
        confirmRemoveAnswer: 'Rimuovere questa risposta?',
        promptHeading: 'Testo della domanda',
        explanationHeading: 'Spiegazione',
        answersHeading: 'Risposte possibili',
        answersHint: 'Seleziona almeno una risposta corretta. Ogni risposta ha la propria lista di blocchi.',
        promptHint: 'Componi la domanda con tutti i blocchi che servono (testo, immagine, video, codice, ...).',
        explanationHint: 'Mostrata dopo la risposta dello studente.',
        noAnswersYet: 'Ancora nessuna risposta. Aggiungine una con il pulsante qui sotto.',
        noActiveLanguages: 'Questo dominio non ha lingue attive configurate.',
        answerHeading: (index) => `Risposta ${index}`,
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        tabQuestion: 'Pregunta',
        tabAnswers: 'Respuestas',
        tabExplanation: 'Explicación',
        translateButton: 'Traducir desde la pestaña actual',
        translateSuccessToast: 'Traducción aplicada.',
        translateErrorToast: 'La traducción automática falló.',
        addAnswer: 'Añadir una respuesta',
        correctAnswer: 'Respuesta correcta',
        removeAnswer: 'Eliminar respuesta',
        confirmRemoveAnswer: '¿Eliminar esta respuesta?',
        promptHeading: 'Enunciado de la pregunta',
        explanationHeading: 'Explicación',
        answersHeading: 'Respuestas posibles',
        answersHint: 'Marca al menos una respuesta correcta. Cada respuesta tiene su propia lista de bloques.',
        promptHint: 'Compón el enunciado con tantos bloques como sea necesario (texto, imagen, vídeo, código, ...).',
        explanationHint: 'Se muestra tras la respuesta del estudiante.',
        noAnswersYet: 'Aún no hay respuestas. Añade una con el botón de abajo.',
        noActiveLanguages: 'Este dominio no tiene idiomas activos configurados.',
        answerHeading: (index) => `Respuesta ${index}`,
      };
    default:
      return {
        tabQuestion: 'Question',
        tabAnswers: 'Answers',
        tabExplanation: 'Explanation',
        translateButton: 'Translate from current tab',
        translateSuccessToast: 'Translation applied.',
        translateErrorToast: 'Automatic translation failed.',
        addAnswer: 'Add an answer',
        correctAnswer: 'Correct answer',
        removeAnswer: 'Remove answer',
        confirmRemoveAnswer: 'Remove this answer?',
        promptHeading: 'Question prompt',
        explanationHeading: 'Explanation',
        answersHeading: 'Possible answers',
        answersHint: 'Mark at least one correct answer. Each answer hosts its own block list.',
        promptHint: 'Compose the prompt with as many blocks as needed (rich text, image, video, code, ...).',
        explanationHint: 'Shown after the learner submits their answer.',
        noAnswersYet: 'No answers yet. Add one with the button below.',
        noActiveLanguages: 'This domain has no active languages configured.',
        answerHeading: (index) => `Answer ${index}`,
      };
  }
}
