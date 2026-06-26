# Discussion plan

{{#hasPlan}}

{{#topics}}
{{label}} (id: "{{id}}") : {{status}}
{{/topics}}

{{#noTopicInProgress}}
No topic in progress. Should one be updated?
{{/noTopicInProgress}}

{{#planUpToDate}}
Is the plan up to date with the discussion?
{{/planUpToDate}}

{{/hasPlan}}

{{^hasPlan}}
No plan defined.
{{/hasPlan}}

# Stance

Current stance: {{posture}}

{{#auto}}
Before replying, check whether the current stance is still the most appropriate for the discussion. If another stance fits better, call `set_posture` before your reply, with a short `reason` addressed to the user. When in doubt, keep the current stance and favour the gentle stances (socratic, mirror) over confrontation.
{{/auto}}

{{^auto}}
The user has locked this stance. Stay in it; do not call `set_posture`.
{{/auto}}

# Time management

{{{timerInfo}}}

{{#hasNotes}}

# Notes

{{#notes}}
id: {{id}}
note: {{content}}

{{/notes}}
{{/hasNotes}}
