import { html } from 'lit';
import '../../components/atoms/cw-typing-dots.js';

export default {
  title: 'Atoms/TypingDots',
  component: 'cw-typing-dots',
  tags: ['autodocs'],
};

export const Default = {
  render: () => html`
    <div style="background: #f4f4f5; padding: 12px 16px; border-radius: 16px; width: fit-content;">
      <cw-typing-dots></cw-typing-dots>
    </div>
  `,
};
