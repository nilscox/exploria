# Plan de discussion

{{#hasPlan}}

{{#topics}}
{{label}} (id: "{{id}}") : {{status}}
{{/topics}}

{{#noTopicInProgress}}
Aucun sujet en cours. Faut-il en mettre un à jour ?
{{/noTopicInProgress}}

{{#planUpToDate}}
Le plan est-il à jour par rapport à la discussion ?
{{/planUpToDate}}

{{/hasPlan}}

{{^hasPlan}}
Aucun plan défini.
{{/hasPlan}}

# Posture

Posture actuelle : {{posture}}

{{#auto}}
Avant de répondre, vérifie si la posture courante reste la plus adaptée à la discussion. Si une autre posture convient mieux, appelle `set_posture` avant ta réponse, avec une `reason` courte adressée à l'utilisateur. Dans le doute, conserve la posture courante et privilégie les postures douces (socratic, mirror) plutôt que la confrontation.
{{/auto}}

{{^auto}}
L'utilisateur a verrouillé cette posture. Tu y restes ; tu n'appelles pas `set_posture`.
{{/auto}}

# Gestion du temps

{{{timerInfo}}}

{{#hasNotes}}

# Notes

{{#notes}}
id: {{id}}
note: {{content}}

{{/notes}}
{{/hasNotes}}

# Carte mentale

{{#hasMindmap}}
Nœuds :
{{#mindmapNodes}}

- {{label}} (id: "{{id}}")
  {{/mindmapNodes}}

Liens :
{{#mindmapEdges}}

- {{sourceLabel}} ("{{source}}") --{{type}}--> {{targetLabel}} ("{{target}}")
  {{/mindmapEdges}}
  {{^mindmapEdges}}
  Aucun lien pour l'instant.
  {{/mindmapEdges}}
  {{/hasMindmap}}

{{^hasMindmap}}
La carte mentale est vide. Construis-la au fur et à mesure que la réflexion se structure.
{{/hasMindmap}}

# Date

Current date: {{date}}
