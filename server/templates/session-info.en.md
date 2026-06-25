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

# Time management

{{{timerInfo}}}

{{#hasNotes}}

# Notes

{{#notes}}
id: {{id}}
note: {{content}}

{{/notes}}
{{/hasNotes}}
