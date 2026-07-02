import type { Shared } from '@exploria/server/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';

import { TopicsListSection } from './topics-list';

export default {
  title: 'TopicsList',
  component: TopicsListSection,
  args: {
    onAdd: action('onAdd'),
  },
  decorators: [
    (Story) => (
      <div className="max-w-64">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TopicsListSection>;

function topic(label: string, status: Shared.TopicStatus = 'pending'): Shared.Topic {
  return { id: label, parentId: null, label, status };
}

export const noTopic: StoryObj<typeof TopicsListSection> = {
  args: {
    topics: [],
  },
};

export const noTopicSelected: StoryObj<typeof TopicsListSection> = {
  args: {
    topics: [
      topic('Market Positioning'),
      topic('Competitive Landscape'),
      topic('Pricing Model'),
      topic('Channel Strategy'),
    ],
  },
};

export const inProgress: StoryObj<typeof TopicsListSection> = {
  args: {
    topics: [
      topic('Market Positioning', 'done'),
      topic('Competitive Landscape', 'done'),
      topic('Pricing Model', 'in_progress'),
      topic('Channel Strategy'),
    ],
  },
};
