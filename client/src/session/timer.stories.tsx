import type { Meta, StoryObj } from '@storybook/react-vite';
import { sub } from 'date-fns';
import { action } from 'storybook/actions';

import { Timer } from './timer';

export default {
  title: 'Timer',
  component: Timer,
  args: {
    onStart: action('onStart'),
    onPause: action('onPause'),
    onResume: action('onResume'),
    onClear: action('onClear'),
  },
  decorators: [
    (Story) => (
      <div className="max-w-64">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Timer>;

const startedAt = sub(new Date(), { minutes: 17 }).toISOString();
const pausedAt = sub(new Date(), { minutes: 4, seconds: 25 }).toISOString();

export const noTimer: StoryObj<typeof Timer> = {
  args: {},
};

export const started: StoryObj<typeof Timer> = {
  args: {
    timer: {
      duration: 60,
      startedAt,
    },
  },
};

export const paused: StoryObj<typeof Timer> = {
  args: {
    timer: {
      duration: 60,
      startedAt,
      pausedAt,
    },
  },
};
