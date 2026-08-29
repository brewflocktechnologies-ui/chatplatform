import { html } from 'lit';
import '../../components/molecules/cw-welcome-cta.js';

const SAMPLE_CTA_CONFIG = {
  buttonText: 'Start Conversation',
  buttonSubtext: 'Typically replies in 5 minutes',
  buttonBg: '#ffffff',
  buttonTextColor: '#18181b',
  buttonIconColor: '#0b5fff',
  buttonBorderRadius: 24,
  buttonPadding: '18px 24px',
};

export default {
  title: 'Molecules/WelcomeCta',
  component: 'cw-welcome-cta',
  tags: ['autodocs'],
  argTypes: {
    accentColor: { control: 'color' },
  },
};

export const Default = {
  args: {
    accentColor: '#0b5fff',
  },
  render: (args: any) => html`
    <div style="width: 320px; background: linear-gradient(135deg, #0b5fff, #22d3ee); padding: 24px; border-radius: 24px;">
      <cw-welcome-cta .config="${SAMPLE_CTA_CONFIG}" .accentColor="${args.accentColor}"></cw-welcome-cta>
    </div>
  `,
};

export const CustomColors = {
  args: {
    accentColor: '#10b981',
  },
  render: (args: any) => html`
    <div style="width: 320px; background: #0f172a; padding: 24px; border-radius: 24px;">
      <cw-welcome-cta
        .config="${{
          ...SAMPLE_CTA_CONFIG,
          buttonText: 'Chat with AI Support',
          buttonSubtext: 'Instant 24/7 assistance',
          buttonBg: '#1e293b',
          buttonTextColor: '#ffffff',
          buttonIconColor: '#10b981',
        }}"
        .accentColor="${args.accentColor}"
      ></cw-welcome-cta>
    </div>
  `,
};
