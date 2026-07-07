export const languages = ['en', 'fr'] as const;

export type Language = (typeof languages)[number];

export type Messages = {
  'tool.result.ok': string;

  'save-note.description': string;
  'save-note.title-param': string;
  'save-note.content-param': string;
  'save-note.topic-param': string;

  'add-topics.description': string;
  'add-topics.parent-param': string;

  'update-topic.description': string;
  'update-topic.summary-param': string;

  'remove-topic.description': string;

  'move-topic.description': string;
  'move-topic.parent-param': string;

  'move-note.description': string;
  'move-note.topic-param': string;

  'ask-questions.description': string;
  'ask-questions.content-param': string;
  'ask-questions.label-param': string;
  'ask-questions.description-param': string;

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

  'chat.answer-selected': (p: { question: string; label: string }) => string;
  'chat.web-search': (p: { query: string; results: string }) => string;
  'chat.web-search-error': (p: { query: string; error: string }) => string;

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
  'save-note.topic-param': 'Id of the topic to attach the note to. Omit to attach it to the subject (root).',

  'add-topics.description':
    'Adds one or more topics to the mind map. Each topic captures an idea, angle or sub-topic. Attach them under an existing topic via its id, or omit the parent to add them at the top level (directly under the subject).',
  'add-topics.parent-param':
    'Id of the parent topic to attach the new topics to. Omit to add them at the top level, directly under the subject.',

  'update-topic.description':
    'Updates a mind map topic (label, status or summary). Set the status to "in_progress" as soon as you start addressing a topic, and "done" once it has been sufficiently covered.',
  'update-topic.summary-param':
    'A summary of the discussion about this topic, kept up to date as it unfolds. Distinct from the label.',

  'remove-topic.description': 'Removes a topic from the mind map, along with its descendants and their attached notes.',

  'move-topic.description': 'Re-attaches a topic under another parent topic, rearranging the mind map.',
  'move-topic.parent-param':
    'Id of the new parent topic. Use null to move the topic to the top level, directly under the subject.',

  'move-note.description': 'Re-attaches a saved note to another topic of the mind map.',
  'move-note.topic-param': 'Id of the topic to attach the note to. Use null to attach it to the subject (root).',

  'ask-questions.description':
    'Asks the user one or more questions, each shown below your message with its options as clickable choices. Do not list them in your text. Use it occasionally, only when a genuine choice of direction arises and it is worth letting the user decide.',
  'ask-questions.content-param': 'The question to ask',
  'ask-questions.label-param': 'Short label of the option',
  'ask-questions.description-param': 'One-sentence description of the option',

  'set-posture.description':
    'Changes the stance you adopt for the conversation. Call it before your reply whenever another stance fits the discussion better than the current one.',
  'set-posture.posture-param':
    'The stance to adopt: socratic (question to deepen thinking), devils_advocate (attack the ideas to test them), examiner (demanding pressure, e.g. interview prep), advisor (neutral help to structure a decision), mirror (reflect and welcome, without challenging), teacher (explain concepts and give context).',
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

  'chat.answer-selected': ({ question, label }) => `Answered "${question}" with: "${label}"`,
  'chat.web-search': ({ query, results }) => `Web search results for "${query}":\n\n${results}`,
  'chat.web-search-error': ({ query, error }) => `Web search for "${query}" failed: ${error}`,

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
  'save-note.topic-param':
    'Id du sujet auquel rattacher la note. À omettre pour la rattacher au sujet global (racine).',

  'add-topics.description':
    'Ajoute un ou plusieurs sujets à la carte mentale. Chaque sujet capture une idée, un axe ou un sous-sujet. Rattache-les sous un sujet existant via son id, ou omets le parent pour les ajouter au premier niveau (directement sous le sujet global).',
  'add-topics.parent-param':
    'Id du sujet parent auquel rattacher les nouveaux sujets. À omettre pour les ajouter au premier niveau, directement sous le sujet global.',

  'update-topic.description':
    "Met à jour un sujet de la carte mentale (intitulé, statut ou résumé). Passe le statut à « en cours » dès que tu commences à aborder un sujet, et « traité » une fois qu'il a été suffisamment couvert.",
  'update-topic.summary-param':
    "Un résumé de la discussion sur ce sujet, tenu à jour au fil de l'échange. Distinct de l'intitulé.",

  'remove-topic.description':
    'Supprime un sujet de la carte mentale, ainsi que ses descendants et leurs notes rattachées.',

  'move-topic.description': 'Rattache un sujet sous un autre sujet parent, pour réorganiser la carte mentale.',
  'move-topic.parent-param':
    'Id du nouveau sujet parent. Utilise null pour déplacer le sujet au premier niveau, directement sous le sujet global.',

  'move-note.description': 'Rattache une note sauvegardée à un autre sujet de la carte mentale.',
  'move-note.topic-param':
    'Id du sujet auquel rattacher la note. Utilise null pour la rattacher au sujet global (racine).',

  'ask-questions.description':
    "Pose une ou plusieurs questions à l'utilisateur, chacune affichée sous ton message avec ses options comme choix cliquables. Ne les énumère pas dans ton texte. À utiliser ponctuellement, uniquement quand un vrai choix de direction se présente et qu'il est pertinent de laisser l'utilisateur trancher.",
  'ask-questions.content-param': 'La question à poser',
  'ask-questions.label-param': "Intitulé court de l'option",
  'ask-questions.description-param': "Description de l'option en une phrase",

  'set-posture.description':
    "Change la posture que tu adoptes pour la conversation. À appeler avant ta réponse dès qu'une autre posture est plus adaptée à la discussion que la posture courante.",
  'set-posture.posture-param':
    "La posture à adopter : socratic (questionner pour approfondir la pensée), devils_advocate (attaquer les idées pour les tester), examiner (pression exigeante, ex. préparation d'entretien), advisor (aide neutre à structurer une décision), mirror (refléter et accueillir, sans challenger), teacher (expliquer des concepts et donner du contexte).",
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

  'chat.answer-selected': ({ question, label }) => `Réponse à « ${question} » : « ${label} »`,
  'chat.web-search': ({ query, results }) => `Résultats de la recherche web pour « ${query} » :\n\n${results}`,
  'chat.web-search-error': ({ query, error }) => `La recherche web pour « ${query} » a échoué : ${error}`,

  'demo.role-1':
    "Tu cherches à réfléchir à un sujet de manière guidée. Ce n'est pas toi qui guide la discussion, tu te laisses guider.",
  'demo.role-2': 'Tu joue le role "user" et non pas "assistant", dans le but de créer un exemple de conversation.',
  'demo.invent-subject':
    'Invente un sujet de réflexion complexe : par exemple, un choix de vie, une décision technique ou une question philosophie. Ne propose pas plusieurs options, énonce simplement le sujet choisi en quelques mots.',
  'demo.conversation-start': 'Voici le début de la conversation.',
  'demo.generate-continue': 'Génère un message court pour continuer la discussion.',
};

export const messages: Record<Language, Messages> = { en, fr };
