import { html } from 'lit';
import '../../components/atoms/cw-status-dot.js';

export default {
  title: 'Atoms/StatusDot',
  component: 'cw-status-dot',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'number' },
    color: { control: 'color' },
    animated: { control: 'boolean' },
    borderWidth: { control: 'number' },
    borderColor: { control: 'color' },
  },
};

export const Default = {
  args: {
    size: 10,
    color: '#22c55e',
    animated: true,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  render: (args: any) => html`
    <cw-status-dot
      .size="${args.size}"
      .color="${args.color}"
      .animated="${args.animated}"
      .borderWidth="${args.borderWidth}"
      .borderColor="${args.borderColor}"
    ></cw-status-dot>
  `,
};

export const StaticOffline = {
  args: {
    size: 10,
    color: '#9ca3af',
    animated: false,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  render: (args: any) => html`
    <cw-status-dot
      .size="${args.size}"
      .color="${args.color}"
      .animated="${args.animated}"
      .borderWidth="${args.borderWidth}"
      .borderColor="${args.borderColor}"
    ></cw-status-dot>
  `,
};
