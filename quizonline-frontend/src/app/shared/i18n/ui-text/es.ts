import type {UiText} from './types';

export const ES: UiText = {
  topmenu: {quiz: 'Cuestionarios', domains: 'Dominios', subjects: 'Temas', questions: 'Preguntas', users: 'Usuarios', features: 'Funciones', donate: 'Donar', about: 'Acerca de', alertsAria: 'Mensajes', currentDomain: 'Dominio actual', ownedDomains: 'Mis dominios', managedDomains: 'Dominios que gestiono', linkedDomains: 'Dominios vinculados', noDomains: 'Ningun dominio', preferences: 'Preferencias', notificationsAria: 'Notificaciones'},
  userMenu: {preferences: 'Preferencias', changePassword: 'Cambiar contraseña', logout: 'Cerrar sesión', login: 'Iniciar sesión', userFallback: 'Usuario'},
  footer: {baseline: 'Plataforma de cuestionarios y gestion de contenido por dominio.', version: 'Version'},
  home: {
    eyebrow: 'Cuestionarios, plantillas y revision',
    lead: 'Un unico espacio para crear cuestionarios, asignarlos, completarlos y revisar los resultados.',
    primaryLoggedIn: 'Ver mis cuestionarios',
    primaryLoggedOut: 'Iniciar sesion',
    secondaryAdmin: 'Crear una plantilla',
    secondaryLoggedOut: 'Crear una cuenta',
    mode: 'Modo',
    modeManager: 'Gestor',
    modeUser: 'Usuario autenticado',
    modeVisitor: 'Visitante',
    languages: 'Idiomas',
    features: 'Funciones',
    featuresValue: 'Cuestionarios, mensajes, asignaciones, revision',
    contactCta: 'Contáctame',
    moderationTileTitle: 'Solicitudes por moderar',
    moderationTileSubtitle: (total) => `${total} pendientes en tus dominios.`,
    moderationTileCount: (n) => n <= 1 ? `${n} solicitud` : `${n} solicitudes`,
  },
  login: {
    eyebrow: 'Acceso', title: 'Accede a tu espacio', subtitle: 'Inicia sesion para continuar.',
    username: 'Usuario', usernamePlaceholder: 'Tu nombre de usuario', usernameError: 'El nombre de usuario es obligatorio (min. 3 caracteres)',
    password: 'Contrasena', passwordPlaceholder: 'Tu contrasena', passwordError: 'La contrasena es obligatoria (min. 4 caracteres)',
    remember: 'Recordarme', forgotPassword: 'Has olvidado tu contrasena?', submit: 'Iniciar sesion', noAccount: 'Aun no tienes cuenta?',
    createAccount: 'Crear cuenta', invalidCredentials: 'Credenciales invalidas. Intentalo de nuevo.', confirmEmailRequired: 'Confirma tu direccion de correo antes de iniciar sesion.', orSeparator: 'o', magicLinkSwitch: 'Iniciar sesión con un enlace mágico', magicLinkBackToPassword: 'Usar una contraseña', magicLinkEmail: 'Correo electrónico', magicLinkEmailPlaceholder: 'tu@email.com', magicLinkSubmit: 'Enviar el enlace', magicLinkSent: 'Si existe una cuenta, te hemos enviado un enlace de acceso por correo.', magicLinkError: 'No se pudo enviar el enlace. Inténtalo de nuevo.', magicLinkExchanging: 'Iniciando sesión…', magicLinkExchangeFailed: 'Enlace no válido o ya usado.', magicLinkExpired: 'Enlace caducado. Solicita uno nuevo.',
  },
  register: {
    title: 'Crear una cuenta', subtitle: 'Identidad, idioma y seguridad', back: 'Volver', create: 'Crear', loading: 'Cargando...',
    identityTitle: 'Identidad', identityBadge: 'perfil', securityTitle: 'Seguridad', securityBadge: 'contrasena',
    username: 'Nombre de usuario', email: 'Correo electronico', firstName: 'Nombre', lastName: 'Apellido', language: 'Idioma',
    domains: 'Dominios', chooseDomains: 'Elegir uno o varios dominios', domainsHint: 'Selecciona los dominios a los que quieres estar vinculado.',
    chooseLanguage: 'Elegir un idioma', password: 'Contrasena', confirmPassword: 'Confirmar contrasena', createAccount: 'Crear mi cuenta',
    cancel: 'Cancelar', usernameRequired: 'El nombre de usuario es obligatorio.', emailRequired: 'El correo electronico es obligatorio.', emailInvalid: 'El correo electronico no es valido.',
    firstNameRequired: 'El nombre es obligatorio.', lastNameRequired: 'El apellido es obligatorio.', languageRequired: 'El idioma es obligatorio.',
    passwordRequired: 'La contrasena es obligatoria.', passwordMin: 'Minimo 8 caracteres.', confirmRequired: 'La confirmacion es obligatoria.',
    passwordMismatch: 'Las contrasenas no coinciden.', success: 'Tu cuenta ha sido creada. Revisa tu correo para confirmar el registro.',
    loadLanguagesError: 'No se pueden cargar los idiomas.', loadDomainsError: 'No se pueden cargar los dominios.', submitError: 'El registro ha fallado. Revisa los datos e intentalo de nuevo.',
  },
  registerPending: {
    title: 'Cuenta creada',
    subtitle: 'Confirma tu direccion de correo',
    lead: 'Tu cuenta se ha creado correctamente.',
    body: 'Revisa ahora tu correo electronico y haz clic en el enlace de confirmacion para activar tu registro.',
    login: 'Ir al inicio de sesion',
  },
  changePassword: {
    title: 'QuizOnline', subtitle: 'Restablecer mi contrasena', oldPassword: 'Contrasena actual', newPassword: 'Nueva contrasena',
    confirmNewPassword: 'Confirmar nueva contrasena', oldPasswordRequired: 'La contrasena actual es obligatoria.', newPasswordRequired: 'La nueva contrasena es obligatoria.',
    newPasswordMin: 'La nueva contrasena debe tener al menos 8 caracteres.', confirmRequired: 'La confirmacion es obligatoria.', mismatch: 'Las contrasenas no coinciden.',
    submit: 'Cambiar contrasena', forceMessage: 'Debes cambiar tu contrasena antes de continuar.', success: 'Tu contrasena ha sido modificada.',
    error: 'Se produjo un error al cambiar la contrasena.',
  },
  resetPassword: {
    title: 'Restablecer la contraseña',
    loading: 'Cargando…',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'tu dirección de correo',
    emailRequired: 'El correo electrónico es obligatorio.',
    emailInvalid: 'El correo electrónico no es válido.',
    emailHint: 'Se enviará un enlace de restablecimiento si el correo existe.',
    successMessage: 'Si existe una cuenta para esa dirección, se ha enviado un correo de restablecimiento.',
    errorGeneric: 'Se ha producido un error. Inténtalo de nuevo más tarde.',
    formInvalid: 'Corrige los errores en el formulario.',
    confirm: {
      title: 'Nueva contraseña',
      subtitle: 'Elige una nueva contraseña para tu cuenta.',
      confirmPassword: 'Confirmar contraseña',
      backToLogin: 'Volver al inicio de sesión',
      linkInvalidOrIncomplete: 'Enlace de restablecimiento no válido o incompleto.',
      linkInvalidOrExpired: 'Enlace de restablecimiento no válido o caducado.',
      successReset: 'Tu contraseña se ha restablecido. Ya puedes iniciar sesión.',
      errorGeneric: 'No se puede restablecer la contraseña.',
    },
  },
  confirmEmail: {
    title: 'Confirmación de correo',
    subtitle: 'Validación de tu registro',
    inProgress: 'Confirmación en curso…',
    successFallback: 'Dirección de correo confirmada con éxito.',
    errorFallback: 'No se puede confirmar esta dirección de correo.',
    invalidLink: 'Enlace de confirmación no válido o incompleto.',
  },
  preferences: {
    eyebrow: 'Mi cuenta', title: 'Preferencias', subtitle: 'Gestiona tu perfil, el idioma de la interfaz y el dominio actual.',
    profileTitle: 'Perfil', profileSubtitle: 'Informacion personal y preferencias de visualizacion.', summaryTitle: 'Resumen',
    summarySubtitle: 'Vista rapida de tu cuenta actual.', loading: 'Cargando...', username: 'Nombre de usuario', email: 'Correo electronico',
    firstName: 'Nombre', lastName: 'Apellido', language: 'Idioma', domains: 'Dominios vinculados', chooseDomains: 'Elegir dominios vinculados', currentDomain: 'Dominio actual', chooseLanguage: 'Elegir un idioma',
    noDomain: 'Ningun dominio', save: 'Guardar', changePassword: 'Cambiar contrasena', role: 'Rol', user: 'Usuario', currentDomainLabel: 'Dominio actual',
    managedDomains: 'Dominios gestionados', ownedDomains: 'Dominios propios', activeAccount: 'Cuenta activa', yes: 'Si', no: 'No',
    roleSuperuser: 'Superuser', roleManager: 'Gestor', roleUser: 'Usuario', roleOwner: 'Propietario', roleMember: 'Miembro vinculado', domainsTitle: 'Dominios', domainsSubtitle: 'Gestiona tus dominios vinculados y elige el dominio actual.', linkedDomainsList: 'Dominios visibles', currentBadge: 'Actual', setCurrent: 'Definir actual', unlinkDomain: 'Abandonar', addDomain: 'Vincular un dominio', noMoreDomains: 'No hay más dominios disponibles.', linkSelectedDomains: 'Vincular selección', cancel: 'Cancelar', ownerLabel: 'Propietario:', deleteDomain: 'Eliminar', deleteDomainSuccess: 'Dominio eliminado.', deleteDomainError: 'No se puede eliminar este dominio.', loadError: 'No se pueden cargar tus preferencias.',
    saveError: 'No se pueden guardar las preferencias.', saveSuccess: 'Preferencias guardadas.', userMissing: 'Usuario no encontrado.',
    pendingRequestsTitle: 'Mis solicitudes pendientes',
    pendingRequestsEmpty: 'Sin solicitudes pendientes.',
    pendingRequestsRequestedAt: 'Solicitado el',
    pendingRequestsCancel: 'Cancelar solicitud',
    tabProfile: 'Perfil',
    tabDomains: 'Dominios',
    tabNotifications: 'Notificaciones',
    notificationsTitle: 'Notificaciones por correo',
    notificationsSubtitle: 'Elige qué correos quieres recibir. Los correos críticos (confirmación de registro, restablecimiento de contraseña, enlace de acceso) siempre se envían.',
    notificationKindJoinRequestCreated: 'Nueva solicitud de acceso en un dominio que modero',
    notificationKindJoinRequestDecided: 'Decisión (aprobada / rechazada) sobre una de mis solicitudes',
    notificationKindJoinRequestExpiry: 'Aviso antes de la cancelación automática de una solicitud pendiente',
    notificationKindInviteReceived: 'Invitación a unirse a un dominio',
    notificationKindTransferReceived: 'Propuesta de transferencia de propiedad',
    notificationKindQuizAssignment: 'Se me ha asignado un cuestionario',
    notificationKindQuizCompleted: 'Un usuario ha completado uno de mis cuestionarios',
    notificationKindQuizResultAvailable: 'Mi puntuación en un cuestionario está disponible',
    notificationKindQuizDetailAvailable: 'La corrección detallada de un cuestionario está disponible',
    notificationChannelEmail: 'Correo',
    notificationChannelWeb: 'Campana',
    notificationGroupUser: 'Mis notificaciones',
    notificationGroupManager: 'Como gestor',
    notificationGroupOwner: 'Como propietario',
    notificationsSaved: 'Preferencias de notificación guardadas.',
  },
  notifications: {
    bellTitle: 'Notificaciones',
    bellEmpty: 'Sin notificaciones.',
    bellMarkAllRead: 'Marcar todo como leído',
    bellSeeAll: 'Ver todas las notificaciones',
    pageTitle: 'Notificaciones',
    pageSubtitle: 'Todo lo que ocurre en tus dominios y tus invitaciones.',
    filterUnread: 'No leídas',
    filterAll: 'Todas',
    filterDeleted: 'Papelera',
    empty: 'Nada que mostrar.',
    emptyHint: 'Recibirás una notificación aquí en cuanto ocurra algo en uno de tus dominios o invitaciones.',
    actionMarkRead: 'Marcar como leída',
    actionDelete: 'Eliminar',
    relative: (s) => {
      const sec = Math.max(0, Math.round(s));
      if (sec < 60) return 'ahora mismo';
      const m = Math.floor(sec / 60);
      if (m < 60) return `hace ${m} min`;
      const h = Math.floor(m / 60);
      if (h < 24) return `hace ${h} h`;
      const d = Math.floor(h / 24);
      return `hace ${d} d`;
    },
    kindLine: (kind, payload) => {
      const dn = String((payload as {domain_name?: string})?.domain_name ?? '');
      const ru = String((payload as {requester_username?: string})?.requester_username ?? '');
      const iu = String((payload as {inviter_username?: string})?.inviter_username ?? '');
      const ii = String((payload as {initiator_username?: string})?.initiator_username ?? '');
      const oc = String((payload as {outcome?: string})?.outcome ?? '');
      switch (kind) {
        case 'domain.join_request.created':
          return `${ru || 'Un usuario'} ha solicitado unirse a "${dn}".`;
        case 'domain.join_request.decided':
          return oc === 'approved'
            ? `Tu solicitud para "${dn}" ha sido aprobada.`
            : `Tu solicitud para "${dn}" ha sido rechazada.`;
        case 'domain.join_request.expiry_warning':
          return `Tu solicitud para "${dn}" está por expirar.`;
        case 'domain.invite.received':
          return `${iu || 'Alguien'} te ha invitado a unirte a "${dn}".`;
        case 'domain.transfer.received':
          return `${ii || 'El propietario'} te propone la propiedad de "${dn}".`;
        case 'quiz.assignment':
          return `Se te ha asignado un nuevo cuestionario "${String((payload as {template_title?: string})?.template_title ?? '')}".`;
        case 'quiz.completed':
          return `${String((payload as {user_username?: string})?.user_username ?? 'Un usuario')} acaba de completar "${String((payload as {template_title?: string})?.template_title ?? '')}".`;
        case 'quiz.result_available':
          return `Tu puntuación en "${String((payload as {template_title?: string})?.template_title ?? '')}" está disponible.`;
        case 'quiz.detail_available':
          return `La corrección detallada de "${String((payload as {template_title?: string})?.template_title ?? '')}" está disponible.`;
        default:
          return kind;
      }
    },
  },
  admin: {
    menuLabel: 'Administración',
    stats: {
      title: 'Estadísticas',
      activeUsers: 'Usuarios activos',
      activeDomains: 'Dominios activos',
      activeQuestions: 'Preguntas activas',
      completedSessions: 'Sesiones completadas',
      domain: 'Dominio',
      members: 'Miembros',
      managers: 'Gestores',
      questions: 'Preguntas',
      templates: 'Plantillas',
      sessions: 'Sesiones',
      completion: 'Finalización',
    },
    languages: {
      title: 'Gestión de idiomas',
      addLanguage: 'Añadir un idioma',
      code: 'Código',
      name: 'Nombre',
      active: 'Activo',
      editLanguage: 'Editar idioma',
      deleteConfirm: '¿Estás seguro de que quieres eliminar este idioma?',
      actions: 'Acciones',
    },
    mailTest: {
      title: 'Prueba de email',
      eyebrow: 'SMTP / Outbox',
      subtitle: 'Lanza un mensaje de prueba usando el flujo real de correo del backend.',
      formTitle: 'Enviar un correo de prueba',
      formSubtitle: 'El backend pone el mensaje en la outbox y arranca la entrega estándar.',
      to: 'Destinatario',
      toPlaceholder: 'destinatario@example.com',
      toRequired: 'El correo es obligatorio.',
      toInvalid: 'El correo no es válido.',
      subject: 'Asunto',
      subjectPlaceholder: 'Déjalo vacío para usar el asunto por defecto',
      subjectHint: 'Opcional. Si está vacío, el backend genera un asunto de prueba.',
      body: 'Mensaje',
      bodyPlaceholder: 'Déjalo vacío para usar el contenido por defecto',
      bodyHint: 'Opcional. Si está vacío, el backend genera un cuerpo con fecha y hora.',
      send: 'Enviar prueba',
      sending: 'Enviando...',
      successTitle: 'Correo en cola',
      errorTitle: 'Error de envío',
      errorFallback: 'No se puede enviar el correo de prueba.',
      resultTitle: 'Último envío',
      resultSubtitle: 'Respuesta inmediata de la API tras ponerlo en cola.',
      resultEmpty: 'No se ha enviado ningún correo de prueba en esta sesión.',
      emailId: 'ID de outbox',
      recipients: 'Destinatarios',
      deliveryNote: 'Si el broker o SMTP no están disponibles, el mensaje puede quedar en cola o enviarse en modo degradado según la configuración del backend.',
    },
    systemConfig: {
      title: 'Configuración del sistema',
      eyebrow: 'Diagnóstico',
      subtitle: 'Vista de solo lectura de la configuración efectiva con comprobaciones bajo demanda.',
      loading: 'Cargando configuración...',
      checking: 'Comprobando...',
      checkedAt: 'Comprobado el',
      checkResultTitle: 'Resultado de la comprobación',
      errorTitle: 'Error del sistema',
      loadError: 'No se puede cargar la configuración del sistema.',
      checkError: 'No se puede ejecutar esta comprobación.',
      sections: {
        db: {
          title: 'Base de datos',
          description: 'Motor, destino y ajustes de conexión con datos enmascarados.',
          check: 'Probar DB',
          fields: {engine: 'Motor', name: 'Nombre', host: 'Host', port: 'Puerto', conn_max_age: 'Conn max age'},
        },
        email: {
          title: 'Email',
          description: 'Backend de correo, remitente y dependencias de entrega.',
          check: 'Probar email',
          fields: {
            backend: 'Backend',
            host: 'Host',
            port: 'Puerto',
            use_tls: 'TLS',
            host_user: 'Usuario',
            host_password_configured: 'Contraseña configurada',
            default_from_email: 'From',
            celery_broker_url: 'Celery broker',
            celery_result_backend: 'Result backend',
          },
        },
        upload: {
          title: 'Upload',
          description: 'Directorio media y límites activos de subida.',
          check: 'Probar escritura',
          fields: {
            media_root: 'Media root',
            media_root_exists: 'Directorio presente',
            data_upload_max_memory_size: 'Data upload max',
            file_upload_max_memory_size: 'File upload max',
            max_upload_file_size: 'Tamaño máximo',
          },
        },
        deepl: {
          title: 'DeepL',
          description: 'Estado de activación y presencia de la clave sin exponer el secreto.',
          check: 'Probar DeepL',
          fields: {enabled: 'Activo', auth_key_configured: 'Clave configurada', is_free: 'Plan free'},
        },
      },
    },
    joinRequests: {
      title: 'Solicitudes de acceso',
      user: 'Usuario',
      email: 'Correo electrónico',
      requestedAt: 'Solicitado el',
      status: 'Estado',
      actions: 'Acciones',
      approve: 'Aprobar',
      reject: 'Rechazar',
      rejectReason: 'Motivo del rechazo',
      rejectReasonPlaceholder: 'Indica el motivo del rechazo…',
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
      cancelled: 'Cancelada',
      all: 'Todas',
      noRequests: 'Ninguna solicitud.',
      moderate: 'Moderar las solicitudes de acceso',
      decidedBy: 'Decidido por',
      decidedAt: 'Decidido el',
      reason: 'Motivo',
      noReason: '—',
      bulkPlaceholder: 'Acciones masivas…',
      bulkApply: 'Aplicar',
      bulkApprove: 'Aprobar la selección',
      bulkReject: 'Rechazar la selección',
      bulkCancel: 'Cancelar',
      bulkSelectedCount: (n) => `${n} seleccionada${n > 1 ? 's' : ''}`,
      bulkRejectHeader: 'Rechazar varias solicitudes',
      bulkRejectMessage: (n) => `El motivo siguiente se guardará para las ${n} solicitudes rechazadas.`,
      bulkActionFailed: 'Una o varias acciones fallaron.',
      bulkResultTitle: 'Acción masiva completada',
      bulkResultDetail: (processed, skipped) => skipped > 0
        ? `${processed} solicitud(es) procesada(s), ${skipped} omitida(s) (ya decidida(s) o fuera de alcance).`
        : `${processed} solicitud(es) procesada(s).`,
    },
  },
  a11y: {
    skipToContent: 'Saltar al contenido principal',
  },
};

