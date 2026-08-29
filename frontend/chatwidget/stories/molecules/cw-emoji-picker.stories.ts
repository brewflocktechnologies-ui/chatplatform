import { html } from 'lit';
import '../../components/molecules/cw-emoji-picker.js';

const DEFAULT_EMOJIS_STR = '😀, 😂, 😊, 😍, 👍, 👎, 🙏, 🎉, ❤️, 😢, 😮, 👌';

export default {
  title: 'Molecules/EmojiPicker',
  component: 'cw-emoji-picker',
  tags: ['autodocs'],
  args: {
    emojis: DEFAULT_EMOJIS_STR,
  },
  argTypes: {
    emojis: {
      control: 'text',
      defaultValue: DEFAULT_EMOJIS_STR,
      description: 'Emoji characters separated by commas or spaces',
    },
  },
};

export const Default = {
  args: {
    emojis: DEFAULT_EMOJIS_STR,
  },
  render: (args: any) => html`
    <div style="position: relative; height: 140px; width: 300px;">
      <cw-emoji-picker .emojis="${args.emojis}"></cw-emoji-picker>
    </div>
  `,
};

