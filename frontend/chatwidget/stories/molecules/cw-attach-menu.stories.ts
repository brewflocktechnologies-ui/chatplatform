import { html } from 'lit';
import '../../components/molecules/cw-attach-menu.js';

export default {
  title: 'Molecules/AttachMenu',
  component: 'cw-attach-menu',
  tags: ['autodocs'],
  argTypes: {},
};

export const Default = {
  args: {},
  render: () => html`
    <div style="position: relative; height: 160px; width: 260px; background: #f8fafc; padding: 16px; border-radius: 12px;">
      <cw-attach-menu></cw-attach-menu>
    </div>
  `,
};
