import { html } from 'lit';
import '../../components/molecules/cw-welcome-hero.js';

const SAMPLE_CONFIG = {
  title: 'Hi there! 👋 How can we help you today?',
  description: 'Our support heroes are here to assist you.',
  avatars: [
    { name: 'Sarah', url: '' },
    { name: 'Alex', url: '' },
    { name: 'John', url: '' },
  ],
};

export default {
  title: 'Molecules/WelcomeHero',
  component: 'cw-welcome-hero',
  tags: ['autodocs'],
  argTypes: {
    headerTextColor: { control: 'color' },
    isGlassy: { control: 'boolean' },
    hideLogo: { control: 'boolean' },
    logoOnly: { control: 'boolean' },
  },
};

export const DefaultNormal = {
  args: {
    headerTextColor: '#ffffff',
    isGlassy: false,
    hideLogo: false,
    logoOnly: false,
  },
  render: (args: any) => html`
    <div style="width: 320px; background: linear-gradient(135deg, #0b5fff, #22d3ee); padding: 24px; border-radius: 24px; color: #ffffff;">
      <cw-welcome-hero
        .config="${SAMPLE_CONFIG}"
        .headerTextColor="${args.headerTextColor}"
        ?isGlassy="${args.isGlassy}"
        ?hideLogo="${args.hideLogo}"
        ?logoOnly="${args.logoOnly}"
      ></cw-welcome-hero>
    </div>
  `,
};

export const GlassyMode = {
  args: {
    headerTextColor: '#ffffff',
    isGlassy: true,
    hideLogo: false,
    logoOnly: false,
  },
  render: (args: any) => html`
    <div style="width: 320px; background: linear-gradient(135deg, #0b5fff, #22d3ee); padding: 24px; border-radius: 24px; color: #ffffff;">
      <cw-welcome-hero .config="${SAMPLE_CONFIG}" .headerTextColor="${args.headerTextColor}" isGlassy logoOnly></cw-welcome-hero>
      <div style="background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.22); border-radius: 24px; padding: 24px; backdrop-filter: blur(16px);">
        <cw-welcome-hero .config="${SAMPLE_CONFIG}" .headerTextColor="${args.headerTextColor}" isGlassy hideLogo></cw-welcome-hero>
      </div>
    </div>
  `,
};
