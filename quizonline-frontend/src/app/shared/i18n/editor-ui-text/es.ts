import {EN} from './en';
import type {EditorUiText} from './types';

export const ES: EditorUiText = {
  ...EN,
  common: {...EN.common, back: 'Volver', cancel: 'Cancelar', clean: 'Limpiar', save: 'Guardar', add: 'Agregar', create: 'Crear', delete: 'Eliminar', confirm: 'Confirmar', duplicate: 'Duplicar', edit: 'Editar', send: 'Enviar', sending: 'Enviando...', refresh: 'Actualizar', close: 'Cerrar', reopen: 'Reabrir', login: 'Iniciar sesion', loading: 'Cargando...', view: 'Ver', previous: 'Anterior', next: 'Siguiente', finish: 'Finalizar', quick: 'Rapido', downloadPdf: 'Descargar PDF'},
  quiz: {newTemplate: 'Nueva plantilla', markAnswered: 'Marcar como respondida', toggleFlag: 'Alternar marcador', alert: 'Reportar', backToQuiz: 'Volver al quiz', finishReview: 'Terminar revision', startQuiz: 'Iniciar el quiz', continueQuiz: 'Continuar el quiz', viewCorrection: 'Ver la correccion', quizFinished: 'Quiz finalizado', backToList: 'Volver a la lista', questionLabel: 'Pregunta'},
  pages: {
    ...EN.pages,
    domainCreate: {title: 'Crear dominio', subtitle: 'Traducciones, estado y acceso'},
    domainEdit: {title: 'Editar dominio', subtitle: 'Traducciones, estado y acceso'},
    subjectCreate: {title: 'Crear tema', subtitle: 'Eleccion del dominio y traducciones'},
    subjectEdit: {title: 'Editar tema', subtitle: 'Traducciones y contenido', questionsTitle: 'Preguntas', addQuestion: 'Anadir', noQuestions: 'Ninguna pregunta.', titleCol: 'Titulo', actionsCol: 'Acciones'},
    questionCreate: {title: 'Crear pregunta', subtitle: 'Dominio, temas, traducciones y respuestas'},
    questionEdit: {title: 'Editar pregunta', subtitle: 'Contexto, traducciones y respuestas'},
    quizQuick: {title: 'Quiz rapido', subtitle: 'Genera una sesion de quiz a partir de un dominio y temas objetivo.', submit: 'Generar quiz'},
    quizCreate: {back: 'Volver', cancel: 'Cancelar', loading: 'Cargando...', createQuestionForTemplate: 'Crear una pregunta para esta plantilla', createQuestionForQuiz: 'Crear una pregunta para este quiz', createQuestion: 'Crear pregunta'},
    userEdit: {title: 'Editar usuario', subtitle: 'Configuracion de la cuenta'},
    userList: {title: 'Usuarios', subtitle: 'Gestion de usuarios', id: 'ID', username: 'Usuario', name: 'Nombre', email: 'Correo', nbDomainMax: 'Dominios max', active: 'Activo', emailConfirmed: 'Email confirmado', actions: 'Acciones'},
  },
};
