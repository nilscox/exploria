export const languages = ['en', 'fr'] as const;

export type Language = (typeof languages)[number];

export type Messages = {
  'tool.result.ok': string;

  'save-note.description': string;
  'save-note.title-param': string;
  'save-note.content-param': string;
  'save-note.node-param': string;

  'start-timer.description': string;
  'start-timer.duration-param': string;

  'add-nodes.description': string;
  'add-nodes.parent-param': string;

  'update-node.description': string;
  'update-node.summary-param': string;

  'remove-node.description': string;

  'move-node.description': string;
  'move-node.parent-param': string;

  'move-note.description': string;
  'move-note.node-param': string;

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
  'save-note.title-param': 'A short title for the note.',
  'save-note.content-param': 'The body of the note: the element worth retaining, in one or a few sentences.',
  'save-note.node-param': 'Id of the mind map node to attach the note to. Omit to attach it to the subject (root).',

  'start-timer.description':
    'Starts a timer to bound the session duration. Use it when the user sets or asks for a time limit.',
  'start-timer.duration-param': 'Session duration in minutes',

  'add-nodes.description':
    'Adds one or more nodes to the mind map. Each node captures an idea, angle or sub-topic. Attach them under an existing node via its id, or omit the parent to add them at the top level (directly under the subject).',
  'add-nodes.parent-param':
    'Id of the parent node to attach the new nodes to. Omit to add them at the top level, directly under the subject.',

  'update-node.description':
    'Updates a mind map node (label, status or summary). Set the status to "in_progress" as soon as you start addressing a node, and "done" once it has been sufficiently covered.',
  'update-node.summary-param':
    'A summary of the discussion about this topic, kept up to date as it unfolds. Distinct from the label.',

  'remove-node.description': 'Removes a node from the mind map, along with its descendants and their attached notes.',

  'move-node.description': 'Re-attaches a node under another parent node, reorganising the mind map.',
  'move-node.parent-param':
    'Id of the new parent node. Use null to move the node to the top level, directly under the subject.',

  'move-note.description': 'Re-attaches a saved note to another node of the mind map.',
  'move-note.node-param': 'Id of the node to attach the note to. Use null to attach it to the subject (root).',

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
  'save-note.title-param': 'Un titre court pour la note.',
  'save-note.content-param': "Le corps de la note : l'élément à retenir, en une ou quelques phrases.",
  'save-note.node-param':
    'Id du noeud de la carte mentale auquel rattacher la note. À omettre pour la rattacher au sujet (racine).',

  'start-timer.description':
    "Démarre un minuteur pour cadrer la durée de la session. À utiliser quand l'utilisateur fixe ou demande une limite de temps.",
  'start-timer.duration-param': 'Temps de la session en minutes',

  'add-nodes.description':
    'Ajoute un ou plusieurs noeuds à la carte mentale. Chaque noeud capture une idée, un axe ou un sous-sujet. Rattache-les sous un noeud existant via son id, ou omets le parent pour les ajouter au premier niveau (directement sous le sujet).',
  'add-nodes.parent-param':
    'Id du noeud parent auquel rattacher les nouveaux noeuds. À omettre pour les ajouter au premier niveau, directement sous le sujet.',

  'update-node.description':
    "Met à jour un noeud de la carte mentale (intitulé, statut ou résumé). Passe le statut à « en cours » dès que tu commences à aborder un noeud, et « traité » une fois qu'il a été suffisamment couvert.",
  'update-node.summary-param':
    "Un résumé de la discussion sur ce sujet, tenu à jour au fil de l'échange. Distinct de l'intitulé.",

  'remove-node.description':
    'Supprime un noeud de la carte mentale, ainsi que ses descendants et leurs notes rattachées.',

  'move-node.description': 'Rattache un noeud sous un autre noeud parent, pour réorganiser la carte mentale.',
  'move-node.parent-param':
    'Id du nouveau noeud parent. Utilise null pour déplacer le noeud au premier niveau, directement sous le sujet.',

  'move-note.description': 'Rattache une note sauvegardée à un autre noeud de la carte mentale.',
  'move-note.node-param': 'Id du noeud auquel rattacher la note. Utilise null pour la rattacher au sujet (racine).',

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
