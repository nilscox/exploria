import type { ChatCompletionTool } from 'openai/resources';

export const tools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'init_plan',
      description: 'Initialise le plan de discussion avec les grandes étapes',
      parameters: {
        type: 'object',
        properties: {
          topics: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                status: { type: 'string', enum: ['pending', 'active', 'done'] },
              },
              required: ['id', 'label', 'status'],
            },
          },
        },
        required: ['topics'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_topic',
      description: "Met à jour le statut d'un topic du plan",
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'active', 'done'] },
        },
        required: ['id', 'status'],
      },
    },
  },
];
