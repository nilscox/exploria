import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';

import { ModelSelector } from './model-selector';

export default {
  title: 'ModelSelector',
  component: ModelSelector,
  decorators: [
    (Story) => (
      <div className="max-w-64">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ModelSelector>;

export const modelSelector: StoryObj<typeof ModelSelector> = {
  args: {
    models: [
      'gpt-5.2',
      'devstral-2512',
      'gemini-3.1-flash-lite-preview',
      'gemini-3.5-flash',
      'llama-4-scout',
      'claude-haiku-4-5',
      'claude-sonnet-4-6',
      'claude-sonnet-4',
      'mistral-small-2603',
      'gpt-5.2-codex',
      'llama-4-maverick',
      'qwen3.7-plus',
    ],
    value: 'mistral-small-2603',
    onChange: action('onChange'),
  },
};
