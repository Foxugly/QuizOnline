import {EN} from './en';
import type {EditorUiText} from './types';

export const IT: EditorUiText = {
  ...EN,
  common: {...EN.common, back: 'Indietro', cancel: 'Annulla', clean: 'Pulisci', save: 'Salva', add: 'Aggiungi', create: 'Crea', delete: 'Elimina', confirm: 'Conferma', duplicate: 'Duplica', edit: 'Modifica', send: 'Invia', sending: 'Invio...', refresh: 'Aggiorna', close: 'Chiudi', reopen: 'Riapri', login: 'Accedi', loading: 'Caricamento...', view: 'Visualizza', previous: 'Precedente', next: 'Successivo', finish: 'Termina', quick: 'Rapido'},
  quiz: {newTemplate: 'Nuovo template', markAnswered: 'Segna come risposta', toggleFlag: 'Attiva/disattiva flag', alert: 'Segnala', backToQuiz: 'Torna al quiz', finishReview: 'Termina la revisione', startQuiz: 'Inizia il quiz', continueQuiz: 'Continua il quiz', viewCorrection: 'Vedi la correzione', quizFinished: 'Quiz terminato', backToList: 'Torna alla lista'},
  pages: {
    ...EN.pages,
    domainCreate: {title: 'Crea dominio', subtitle: 'Traduzioni, stato e accesso'},
    domainEdit: {title: 'Modifica dominio', subtitle: 'Traduzioni, stato e accesso'},
    subjectCreate: {title: 'Crea argomento', subtitle: 'Scelta del dominio e traduzioni'},
    subjectEdit: {title: 'Modifica argomento', subtitle: 'Traduzioni e contenuto', questionsTitle: 'Domande', addQuestion: 'Aggiungi', noQuestions: 'Nessuna domanda.', titleCol: 'Titolo', actionsCol: 'Azioni'},
    questionCreate: {title: 'Crea domanda', subtitle: 'Dominio, argomenti, traduzioni e risposte'},
    questionEdit: {title: 'Modifica domanda', subtitle: 'Contesto, traduzioni e risposte'},
    quizQuick: {title: 'Quiz rapido', subtitle: 'Genera una sessione quiz da un dominio e da argomenti mirati.', submit: 'Genera quiz'},
    quizCreate: {back: 'Indietro', cancel: 'Annulla', loading: 'Caricamento...', createQuestionForTemplate: 'Crea una domanda per questo template', createQuestionForQuiz: 'Crea una domanda per questo quiz', createQuestion: 'Crea domanda'},
    userEdit: {title: 'Modifica utente', subtitle: 'Impostazioni account'},
    userList: {title: 'Utenti', subtitle: 'Gestione utenti', id: 'ID', username: 'Nome utente', name: 'Nome', email: 'Email', nbDomainMax: 'Max domini', active: 'Attivo', emailConfirmed: 'Email confermata', actions: 'Azioni'},
  },
};
