import type { Preview } from '@storybook/react-vite';

import '../src/index.css';

export default {
  parameters: {
    darkMode: {
      classTarget: 'html',
      stylePreview: true,
    },
  },
} satisfies Preview;
