import type { Preview } from '@storybook/web-components';
import { initStore } from '../store/chat-store.js';

// Ensure global central store is initialized for all stories
initStore().catch(() => {});

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
