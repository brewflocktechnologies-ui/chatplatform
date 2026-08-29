import { html } from 'lit';
import '../../components/molecules/cw-chat-footer.js';

const DEFAULT_FOOTER_ARGS = {
  poweredByText: 'vAInatheya.ai',
  poweredByLink: 'https://vainatheya.ai',
  poweredByColor: '#64748b',
  footerBg: '#ffffff',
  footerTextColor: '#64748b',
  footerFontSize: 11,
  footerPaddingBottom: 16,
  widgetBorderRadius: 24,
};

export default {
  title: 'Molecules/ChatFooter',
  component: 'cw-chat-footer',
  tags: ['autodocs'],
  args: DEFAULT_FOOTER_ARGS,
  argTypes: {
    poweredByText: { control: 'text', defaultValue: DEFAULT_FOOTER_ARGS.poweredByText },
    poweredByLink: { control: 'text', defaultValue: DEFAULT_FOOTER_ARGS.poweredByLink },
    poweredByColor: { control: 'color', defaultValue: DEFAULT_FOOTER_ARGS.poweredByColor },
    footerBg: { control: 'color', defaultValue: DEFAULT_FOOTER_ARGS.footerBg },
    footerTextColor: { control: 'color', defaultValue: DEFAULT_FOOTER_ARGS.footerTextColor },
    footerFontSize: { control: { type: 'number', min: 8, max: 32 }, defaultValue: DEFAULT_FOOTER_ARGS.footerFontSize },
    footerPaddingBottom: { control: { type: 'number', min: 0, max: 64 }, defaultValue: DEFAULT_FOOTER_ARGS.footerPaddingBottom },
    widgetBorderRadius: { control: { type: 'number', min: 0, max: 48 }, defaultValue: DEFAULT_FOOTER_ARGS.widgetBorderRadius },
  },
};

export const Default = {
  args: DEFAULT_FOOTER_ARGS,
  render: (args: any) => html`
    <cw-chat-footer
      .poweredByText="${args.poweredByText}"
      .poweredByLink="${args.poweredByLink}"
      .poweredByColor="${args.poweredByColor}"
      .footerBg="${args.footerBg}"
      .footerTextColor="${args.footerTextColor}"
      .footerFontSize="${args.footerFontSize}"
      .footerPaddingBottom="${args.footerPaddingBottom}"
      .widgetBorderRadius="${args.widgetBorderRadius}"
    ></cw-chat-footer>
  `,
};
