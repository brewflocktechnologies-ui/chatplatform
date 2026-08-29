import { html } from 'lit';
import '../../components/molecules/cw-chat-menu.js';

export default {
  title: 'Molecules/ChatMenu',
  component: 'cw-chat-menu',
  tags: ['autodocs'],
  args: {
    soundsOn: true,
  },
  argTypes: {
    soundsOn: { control: 'boolean', defaultValue: true },
  },
};

export const Default = {
  args: {
    soundsOn: true,
  },
  render: (args: any) => html`
    <div style="position: relative; height: 160px; width: 260px; background: #f8fafc; padding: 16px; border-radius: 12px;">
      <cw-chat-menu .soundsOn="${args.soundsOn}"></cw-chat-menu>
    </div>
  `,
};
