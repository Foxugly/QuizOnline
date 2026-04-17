import {EN} from './en';
import type {EditorUiText} from './types';

export const NL: EditorUiText = {
  ...EN,
  common: {...EN.common, back: 'Terug', cancel: 'Annuleren', clean: 'Wissen', save: 'Opslaan', add: 'Toevoegen', create: 'Maken', delete: 'Verwijderen', confirm: 'Bevestigen', duplicate: 'Dupliceren', edit: 'Bewerken', send: 'Verzenden', sending: 'Verzenden...', refresh: 'Vernieuwen', close: 'Afsluiten', reopen: 'Heropenen', login: 'Aanmelden', loading: 'Laden...', view: 'Bekijken', previous: 'Vorige', next: 'Volgende', finish: 'Voltooien', quick: 'Snel'},
  quiz: {newTemplate: 'Nieuw template', markAnswered: 'Markeer als beantwoord', toggleFlag: 'Markering omschakelen', alert: 'Melden', backToQuiz: 'Terug naar quiz', finishReview: 'Nakijken voltooien', startQuiz: 'Quiz starten', continueQuiz: 'Quiz voortzetten', viewCorrection: 'Correctie bekijken', quizFinished: 'Quiz voltooid', backToList: 'Terug naar lijst', questionLabel: 'Vraag'},
  pages: {
    ...EN.pages,
    domainCreate: {title: 'Domein maken', subtitle: 'Vertalingen, status en toegang'},
    domainEdit: {title: 'Domein bewerken', subtitle: 'Vertalingen, status en toegang'},
    subjectCreate: {title: 'Onderwerp maken', subtitle: 'Domeinkeuze en vertalingen'},
    subjectEdit: {title: 'Onderwerp bewerken', subtitle: 'Vertalingen en inhoud', questionsTitle: 'Vragen', addQuestion: 'Toevoegen', noQuestions: 'Geen vraag.', titleCol: 'Titel', actionsCol: 'Acties'},
    questionCreate: {title: 'Vraag maken', subtitle: 'Domein, onderwerpen, vertalingen en antwoorden'},
    questionEdit: {title: 'Vraag bewerken', subtitle: 'Context, vertalingen en antwoorden'},
    quizQuick: {title: 'Snelle quiz', subtitle: 'Genereer een quizsessie vanuit een domein en doelonderwerpen.', submit: 'Quiz genereren'},
    quizCreate: {back: 'Terug', cancel: 'Annuleren', loading: 'Laden...', createQuestionForTemplate: 'Een vraag maken voor dit template', createQuestionForQuiz: 'Een vraag maken voor deze quiz', createQuestion: 'Vraag maken'},
    userEdit: {title: 'Gebruiker bewerken', subtitle: 'Accountinstellingen'},
    userList: {title: 'Gebruikers', subtitle: 'Gebruikersbeheer', id: 'ID', username: 'Gebruikersnaam', name: 'Naam', email: 'E-mail', nbDomainMax: 'Max domeinen', active: 'Actief', emailConfirmed: 'E-mail bevestigd', actions: 'Acties'},
  },
};
