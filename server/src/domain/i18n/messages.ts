export const languages = ['en', 'fr'] as const;

export type Language = (typeof languages)[number];

export type Messages = {
  'tool.result.ok': string;

  'save-note.description': string;

  'start-timer.description': string;
  'start-timer.duration-param': string;

  'add-topics.description': string;

  'clear-timer.description': string;

  'get-remaining-time.description': string;

  'get-saved-notes.description': string;
  'get-saved-notes.empty': string;
  'get-saved-notes.heading': string;

  'pause-timer.description': string;

  'resume-timer.description': string;

  'set-discussion-paths.description': string;
  'set-discussion-paths.label-param': string;
  'set-discussion-paths.description-param': string;

  'set-posture.description': string;
  'set-posture.posture-param': string;
  'set-posture.reason-param': string;

  'set-subject.description': string;

  'update-topic.description': string;

  'web-search.description': string;
  'web-search.query-param': string;
  'web-search.no-results': (p: { query: string }) => string;

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
  'tool.result.ok': 'OK',

  'save-note.description':
    'Saves an important element of the conversation (key point, user position, insight, identified tension). Use it whenever something is worth retaining for the final summary.',

  'start-timer.description':
    'Starts a timer to bound the session duration. Use it when the user sets or asks for a time limit.',
  'start-timer.duration-param': 'Session duration in minutes',

  'add-topics.description':
    'Adds one or more topics to the discussion. Use it when the conversation surfaces new angles to explore.',

  'clear-timer.description': 'Cancels the current timer.',

  'get-remaining-time.description':
    'Gets the time remaining on the timer. Use it to gauge the pace or to decide whether to wrap up.',

  'get-saved-notes.description':
    'Gets all notes saved during the session. Use it before producing a summary, or to recall what has been said.',
  'get-saved-notes.empty': 'No notes saved.',
  'get-saved-notes.heading': 'Saved notes:',

  'pause-timer.description': 'Pauses the timer.',

  'resume-timer.description': 'Resumes the paused timer.',

  'set-discussion-paths.description':
    'Offers several possible directions for what comes next, shown as clickable options below your message. Do not list them in your text. Use it occasionally, only when a genuine choice of direction arises and it is worth letting the user decide.',
  'set-discussion-paths.label-param': 'Short label of the path',
  'set-discussion-paths.description-param': 'Optional one-sentence description',

  'set-posture.description':
    'Changes the stance you adopt for the conversation. Call it before your reply whenever another stance fits the discussion better than the current one.',
  'set-posture.posture-param':
    'The stance to adopt: socratic (question to deepen thinking), devils_advocate (attack the ideas to test them), examiner (demanding pressure, e.g. interview prep), advisor (neutral help to structure a decision), mirror (reflect and welcome, without challenging).',
  'set-posture.reason-param':
    'A short explanation, addressed to the user in their language, of why you are adopting this stance.',

  'web-search.description':
    'Searches the web to verify a factual claim. Use it before challenging or endorsing a fact. Do not use it for subjective or philosophical questions. Cite sources naturally in your reply.',
  'web-search.query-param': 'The search query',
  'web-search.no-results': ({ query }) => `No results found for: "${query}"`,

  'set-subject.description':
    'Updates the overall subject of the conversation, when it becomes clearer or shifts along the way.',

  'update-topic.description':
    'Updates a topic of the plan (label or status). Call it as soon as you start addressing a topic ("in progress") or have covered it sufficiently ("done").',

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
  'tool.result.ok': 'OK',

  'save-note.description':
    "Sauvegarde un élément important de la conversation (point clé, position de l'utilisateur, insight, tension identifiée). À utiliser dès qu'un élément mérite d'être retenu pour la synthèse finale.",

  'start-timer.description':
    "Démarre un minuteur pour cadrer la durée de la session. À utiliser quand l'utilisateur fixe ou demande une limite de temps.",
  'start-timer.duration-param': 'Temps de la session en minutes',

  'add-topics.description':
    'Ajoute un ou plusieurs sujets à la discussion. À utiliser quand la conversation fait émerger de nouveaux axes à explorer.',

  'clear-timer.description': 'Annule le minuteur en cours.',

  'get-remaining-time.description':
    "Récupère le temps restant sur le minuteur. À utiliser pour jauger le rythme ou décider s'il faut conclure.",

  'get-saved-notes.description':
    'Récupère toutes les notes sauvegardées au cours de la session. À utiliser avant de produire une synthèse, ou pour te remémorer ce qui a été dit.',
  'get-saved-notes.empty': 'Aucune note sauvegardée.',
  'get-saved-notes.heading': 'Notes sauvegardées :',

  'pause-timer.description': 'Met en pause le minuteur.',

  'resume-timer.description': 'Redémarre le minuteur mis en pause.',

  'set-discussion-paths.description':
    "Propose plusieurs axes possibles pour la suite, affichés comme des options cliquables sous ton message. Ne les énumère pas dans ton texte. À utiliser ponctuellement, uniquement quand un vrai choix de direction se présente et qu'il est pertinent de laisser l'utilisateur trancher.",
  'set-discussion-paths.label-param': 'Intitulé court du chemin',
  'set-discussion-paths.description-param': 'Description optionnelle en une phrase',

  'set-posture.description':
    "Change la posture que tu adoptes pour la conversation. À appeler avant ta réponse dès qu'une autre posture est plus adaptée à la discussion que la posture courante.",
  'set-posture.posture-param':
    "La posture à adopter : socratic (questionner pour approfondir la pensée), devils_advocate (attaquer les idées pour les tester), examiner (pression exigeante, ex. préparation d'entretien), advisor (aide neutre à structurer une décision), mirror (refléter et accueillir, sans challenger).",
  'set-posture.reason-param':
    "Une courte explication, adressée à l'utilisateur dans sa langue, de la raison pour laquelle tu adoptes cette posture.",

  'web-search.description':
    "Effectue une recherche web pour vérifier une affirmation factuelle. À utiliser avant de contester ou d'endosser un fait. Ne pas utiliser pour des questions subjectives ou philosophiques. Cite les sources naturellement dans ta réponse.",
  'web-search.query-param': 'La requête de recherche',
  'web-search.no-results': ({ query }) => `Aucun résultat trouvé pour : "${query}"`,

  'set-subject.description':
    "Met à jour le sujet global de la conversation, lorsqu'il se précise ou évolue en cours de route.",

  'update-topic.description':
    "Met à jour un sujet du plan (intitulé ou statut). À appeler dès que tu commences à aborder un sujet (« en cours ») ou que tu l'as suffisamment traité (« traité »).",

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
