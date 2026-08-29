import { html } from 'lit';
import '../../components/atoms/cw-button.js';
import { ICON_ARG_TYPE } from '../utils/icon-options.js';

export default {
  title: 'Atoms/Button',
  component: 'cw-button',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select', options: ['primary', 'secondary', 'ghost', 'outline', 'danger', 'icon'] },
      description: 'Button visual style variant',
    },
    size: {
      control: { type: 'select', options: ['xs', 'sm', 'md', 'lg'] },
      description: 'Button size preset',
    },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
    icon: ICON_ARG_TYPE,
    iconPosition: { control: { type: 'select', options: ['left', 'right', 'only'] } },
    fullWidth: { control: 'boolean' },
    bg: { control: 'color', description: 'Custom background color or CSS gradient' },
    color: { control: 'color', description: 'Custom text color' },
  },
};

const renderButton = (args: any) => html`
  <cw-button
    .variant="${args.variant}"
    .size="${args.size}"
    .label="${args.label}"
    .icon="${args.icon}"
    .iconPosition="${args.iconPosition}"
    ?disabled="${args.disabled}"
    ?fullWidth="${args.fullWidth}"
    .bg="${args.bg}"
    .color="${args.color}"
  ></cw-button>
`;

export const Primary = {
  args: {
    variant: 'primary',
    size: 'md',
    label: 'Start Conversation',
    icon: 'MessageCircle',
    iconPosition: 'left',
    disabled: false,
    fullWidth: false,
  },
  render: renderButton,
};

export const Secondary = {
  args: {
    variant: 'secondary',
    size: 'md',
    label: 'Cancel',
    icon: '',
    disabled: false,
  },
  render: renderButton,
};

export const GhostIcon = {
  args: {
    variant: 'icon',
    size: 'md',
    icon: 'Maximize2',
    disabled: false,
  },
  render: renderButton,
};

export const Danger = {
  args: {
    variant: 'danger',
    size: 'md',
    label: 'End Chat',
    icon: 'Power',
    disabled: false,
  },
  render: renderButton,
};

export const CustomStyled = {
  args: {
    variant: 'primary',
    size: 'lg',
    label: 'Custom Gradient Button',
    icon: 'Sparkles',
    bg: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
    color: '#ffffff',
    borderRadius: 16,
  },
  render: renderButton,
};
