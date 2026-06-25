{{#timer}}

Temps de la session : {{duration}} minutes
Temps écoulé : {{elapsed}} minutes
Temps restant : {{remaining}} minutes

{{#timeUp}}
Temps imparti écoulé, il est nécessaire de conclure
{{/timeUp}}

{{#paused}}
Chronomètre en pause
{{/paused}}

{{/timer}}

{{^timer}}
Aucun chronomètre démarré
{{/timer}}
