import { html } from 'lit';
import '../../components/atoms/cw-tooltip.js';

export default {
  title: 'Atoms/Tooltip',
  component: 'cw-tooltip',
  tags: ['autodocs'],
  argTypes: {
    text: { control: 'text' },
    position: { control: { type: 'select', options: ['left', 'right', 'top', 'bottom'] } },
    backgroundColor: { control: 'color' },
    textColor: { control: 'color' },
    fontSize: { control: { type: 'number', min: 8, max: 24 } },
    padding: { control: { type: 'number', min: 0, max: 40 }, description: 'Padding (px)' },
    boxShadow: { control: 'color', description: 'Shadow color picker or custom shadow string' },
    borderWidth: { control: { type: 'number', min: 0, max: 10 }, description: 'Border width (min 0)' },
    borderColor: { control: 'color', description: 'Border color' },
    arrowEnabled: { control: 'boolean' },
    visible: { control: 'boolean' },
  },
};

const renderTooltip = (args: any) => html`
  <div style="padding: 60px 120px; position: relative; display: inline-block;">
    <button style="padding: 10px 20px; border-radius: 8px; border: 1px solid #cbd5e1; background: #ffffff; font-weight: 500; cursor: pointer;">Anchor Target</button>
    <cw-tooltip
      .text="${args.text}"
      .position="${args.position}"
      .backgroundColor="${args.backgroundColor}"
      .textColor="${args.textColor}"
      .fontSize="${args.fontSize}"
      .padding="${args.padding}"
      .boxShadow="${args.boxShadow}"
      .borderWidth="${args.borderWidth}"
      .borderColor="${args.borderColor}"
      .arrowEnabled="${args.arrowEnabled}"
      .visible="${args.visible}"
    ></cw-tooltip>
  </div>
`;

export const LeftPosition = {
  args: {
    text: 'Chat with us 👋',
    position: 'left',
    backgroundColor: '#ffffff',
    textColor: '#374151',
    fontSize: 14,
    padding: 12,
    boxShadow: 'rgba(0, 0, 0, 0.12)',
    borderWidth: 0,
    borderColor: '#cbd5e1',
    arrowEnabled: true,
    visible: true,
  },
  render: renderTooltip,
};

export const RightPosition = {
  args: {
    text: 'We reply in 5 minutes!',
    position: 'right',
    backgroundColor: '#1e293b',
    textColor: '#ffffff',
    fontSize: 13,
    padding: 12,
    boxShadow: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 0,
    borderColor: '#334155',
    arrowEnabled: true,
    visible: true,
  },
  render: renderTooltip,
};

