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

# Gestion du temps

{{{timerInfo}}}

{{#hasNotes}}

# Notes

{{#notes}}
id: {{id}}
note: {{content}}

{{/notes}}
{{/hasNotes}}
