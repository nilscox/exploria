import type { Meta, StoryObj } from '@storybook/react-vite';

import { Select, SelectItem } from './select';

export default {
  title: 'Select',
  component: Select,
  decorators: [
    (Story) => (
      <div className="max-w-64">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Select>;

export const select: StoryObj<typeof Select> = {
  args: {
    children: (
      <>
        <SelectItem value="window">Windows</SelectItem>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="linux">Linux</SelectItem>
      </>
    ),
  },
};
