{{#timer}}

Session time: {{duration}} minutes
Elapsed time: {{elapsed}} minutes
Remaining time: {{remaining}} minutes

{{#timeUp}}
Time is up, it is necessary to conclude
{{/timeUp}}

{{#paused}}
Timer paused
{{/paused}}

{{/timer}}

{{^timer}}
No timer started
{{/timer}}
