import { html } from 'lit';
import '../../components/molecules/cw-greet-input.js';

export default {
  title: 'Molecules/GreetInput',
  component: 'cw-greet-input',
  tags: ['autodocs'],
  argTypes: {
    enabled: { control: 'boolean' },
    openingTimeAfterInitialLoadSec: { control: { type: 'number', min: 0, max: 10, step: 0.5 } },
    animationOpeningSec: { control: { type: 'number', min: 0.1, max: 3, step: 0.1 } },
    layout: {
      control: 'select',
      options: ['separated', 'joined'],
      description: 'Switch between separated (floating button) and joined (combined input bar) layouts',
    },
    placeholder: { control: 'text' },
    backgroundColor: { control: 'color' },
    textColor: { control: 'color' },
    borderRadius: { control: { type: 'number', min: 0, max: 40 } },
    boxShadow: { control: 'text' },
    buttonColor: { control: 'color' },
    buttonIconColor: { control: 'color' },
  },
};

export const ConfigurableGreetInput = {
  args: {
    enabled: true,
    openingTimeAfterInitialLoadSec: 6.0,
    animationOpeningSec: 0.8,
    layout: 'separated',
    placeholder: 'Write your message...',
    backgroundColor: '#ffffff',
    textColor: '#1e293b',
    borderRadius: 24,
    boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
    buttonColor: '#d97706',
    buttonIconColor: '#ffffff',
  },
  render: (args: any) => html`
    <div style="width: 340px; padding: 24px; background: #f8fafc; border-radius: 16px;">
      <cw-greet-input
        .config="${{
          enabled: args.enabled,
          visible: true,
          openingTimeAfterInitialLoadSec: args.openingTimeAfterInitialLoadSec,
          animationOpeningSec: args.animationOpeningSec,
          layout: args.layout,
          placeholder: args.placeholder,
          backgroundColor: args.backgroundColor,
          textColor: args.textColor,
          borderRadius: args.borderRadius,
          boxShadow: args.boxShadow,
          buttonColor: args.buttonColor,
          buttonIconColor: args.buttonIconColor,
        }}"
        .accentColor="${args.buttonColor}"
      ></cw-greet-input>
    </div>
  `,
};
