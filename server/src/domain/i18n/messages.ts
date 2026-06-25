export const languages = ['en', 'fr'] as const;

export type Language = (typeof languages)[number];

export type Messages = {
  'save-note.description': string;
  'save-note.result': (p: { note: string }) => string;

  'start-timer.description': string;
  'start-timer.duration-param': string;
  'start-timer.result': (p: { duration: number }) => string;

  'add-topic.description': string;
  'add-topic.result': (p: { label: string }) => string;

  'clear-timer.description': string;
  'clear-timer.result': string;

  'get-remaining-time.description': string;

  'get-saved-notes.description': string;
  'get-saved-notes.empty': string;
  'get-saved-notes.heading': string;

  'init-plan.description': string;
  'init-plan.subject-param': string;
  'init-plan.topics-param': string;
  'init-plan.result': string;

  'pause-timer.description': string;
  'pause-timer.result': string;

  'resume-timer.description': string;
  'resume-timer.result': string;

  'set-discussion-paths.description': string;
  'set-discussion-paths.label-param': string;
  'set-discussion-paths.description-param': string;
  'set-discussion-paths.result': string;

  'set-subject.description': string;
  'set-subject.result': (p: { subject: string }) => string;

  'update-topic.description': string;
  'update-topic.result': (p: { label: string | undefined }) => string;

  'session-info.status.pending': string;
  'session-info.status.in_progress': string;
  'session-info.status.done': string;

  'chat.discussion-path-selected': (p: { label: string }) => string;

  'demo.role-1': string;
  'demo.role-2': string;
  'demo.invent-subject': string;
  'demo.conversation-start': string;
  'demo.generate-continue': string;
};

const en: Messages = {
  'save-note.description': 'Saves an important element of the conversation (key point, quote, user insight)',
  'save-note.result': ({ note }) => `Note saved: "${note}"`,

  'start-timer.description': 'Starts a timer',
  'start-timer.duration-param': 'Session duration in minutes',
  'start-timer.result': ({ duration }) => `Timer started: ${duration} minutes.`,

  'add-topic.description': 'Adds a topic to the discussion plan',
  'add-topic.result': ({ label }) => `Topic added: ${label}.`,

  'clear-timer.description': 'Cancels the timer',
  'clear-timer.result': 'Timer cancelled.',

  'get-remaining-time.description': 'Gets the time remaining on the timer',

  'get-saved-notes.description': 'Gets all notes saved during the session',
  'get-saved-notes.empty': 'No notes saved.',
  'get-saved-notes.heading': 'Saved notes:',

  'init-plan.description': 'Initializes the discussion plan with the main steps',
  'init-plan.subject-param': 'The main subject of the discussion in a few words',
  'init-plan.topics-param': 'The different aspects to address',
  'init-plan.result': 'Plan initialized.',

  'pause-timer.description': 'Pauses the timer',
  'pause-timer.result': 'Timer paused.',

  'resume-timer.description': 'Resumes the timer',
  'resume-timer.result': 'Timer resumed.',

  'set-discussion-paths.description':
    'Offers the user several possible paths for continuing the discussion (go deeper, change angle, move on, etc.)',
  'set-discussion-paths.label-param': 'Short label of the path',
  'set-discussion-paths.description-param': 'Optional one-sentence description',
  'set-discussion-paths.result': 'Discussion paths offered.',

  'set-subject.description': 'Updates the overall subject of the conversation',
  'set-subject.result': ({ subject }) => `Subject changed: ${subject}.`,

  'update-topic.description': 'Updates a topic of the plan (label or status)',
  'update-topic.result': ({ label }) => `Topic "${label}" updated.`,

  'session-info.status.pending': 'to address',
  'session-info.status.in_progress': 'in progress',
  'session-info.status.done': 'done',

  'chat.discussion-path-selected': ({ label }) => `Selected discussion path: "${label}"`,

  'demo.role-1':
    'You are reflecting on a topic in a guided way. You are not the one guiding the discussion, you let yourself be guided.',
  'demo.role-2': 'You play the "user" role and not the "assistant" role, in order to create an example conversation.',
  'demo.invent-subject':
    'Invent a complex topic for reflection: for example, a life choice, a technical decision or a philosophical question. Do not offer several options, simply state the chosen topic in a few words.',
  'demo.conversation-start': 'Here is the beginning of the conversation.',
  'demo.generate-continue': 'Generate a short message to continue the discussion.',
};

const fr: Messages = {
  'save-note.description':
    "Sauvegarde un élément important de la conversation (point clé, citation, insight de l'utilisateur)",
  'save-note.result': ({ note }) => `Note sauvegardée : "${note}"`,

  'start-timer.description': 'Démarre un chronomètre',
  'start-timer.duration-param': 'Temps de la session en minutes',
  'start-timer.result': ({ duration }) => `Chronomètre démarré : ${duration} minutes.`,

  'add-topic.description': 'Ajoute un sujet au plan de discussion',
  'add-topic.result': ({ label }) => `Sujet ajouté : ${label}.`,

  'clear-timer.description': 'Annule le chronomètre',
  'clear-timer.result': 'Chronomètre annulé.',

  'get-remaining-time.description': 'Récupérer le temps restant sur le chronomètre',

  'get-saved-notes.description': 'Récupère toutes les notes sauvegardées au cours de la session',
  'get-saved-notes.empty': 'Aucune note sauvegardée.',
  'get-saved-notes.heading': 'Notes sauvegardées :',

  'init-plan.description': 'Initialise le plan de discussion avec les grandes étapes',
  'init-plan.subject-param': 'Le sujet principal de la discussion en quelques mots',
  'init-plan.topics-param': 'Les différents aspects à traiter',
  'init-plan.result': 'Plan initialisé.',

  'pause-timer.description': 'Met en pause le chronomètre',
  'pause-timer.result': 'Chronomètre mis en pause.',

  'resume-timer.description': 'Redémarre le chronomètre',
  'resume-timer.result': 'Chronomètre redémarré.',

  'set-discussion-paths.description':
    "Propose à l'utilisateur plusieurs chemins possibles pour la suite de la discussion (approfondir, changer d'angle, passer à la suite, etc.)",
  'set-discussion-paths.label-param': 'Intitulé court du chemin',
  'set-discussion-paths.description-param': 'Description optionnelle en une phrase',
  'set-discussion-paths.result': 'Chemins de discussion proposés.',

  'set-subject.description': 'Met à jour le sujet global de la conversation',
  'set-subject.result': ({ subject }) => `Sujet changé : ${subject}.`,

  'update-topic.description': "Met à jour un sujet du plan (intitulé ou statut)",
  'update-topic.result': ({ label }) => `Sujet "${label}" mis à jour.`,

  'session-info.status.pending': 'à traiter',
  'session-info.status.in_progress': 'en cours',
  'session-info.status.done': 'traité',

  'chat.discussion-path-selected': ({ label }) => `Chemin de discussion sélectionné: "${label}"`,

  'demo.role-1':
    "Tu cherches à réfléchir à un sujet de manière guidée. Ce n'est pas toi qui guide la discussion, tu te laisses guider.",
  'demo.role-2': 'Tu joue le role "user" et non pas "assistant", dans le but de créer un exemple de conversation.',
  'demo.invent-subject':
    'Invente un sujet de réflexion complexe : par exemple, un choix de vie, une décision technique ou une question philosophie. Ne propose pas plusieurs options, énonce simplement le sujet choisi en quelques mots.',
  'demo.conversation-start': 'Voici le début de la conversation.',
  'demo.generate-continue': 'Génère un message court pour continuer la discussion.',
};

export const messages: Record<Language, Messages> = { en, fr };
