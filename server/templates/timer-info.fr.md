{{#timer}}

Temps de la session : {{duration}} minutes
Temps écoulé : {{elapsed}} minutes
Temps restant : {{remaining}} minutes

{{#timeUp}}
Temps imparti écoulé, il est nécessaire de conclure
{{/timeUp}}

{{#paused}}
Minuteur en pause
{{/paused}}

{{/timer}}

{{^timer}}
Aucun minuteur démarré
{{/timer}}
