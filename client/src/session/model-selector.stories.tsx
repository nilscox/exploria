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
    value: 'mistral-small-2603',
    onChange: action('onChange'),
  },
};
