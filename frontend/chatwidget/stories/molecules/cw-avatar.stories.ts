import { html } from 'lit';
import '../../components/molecules/cw-avatar.js';

export default {
  title: 'Molecules/Avatar',
  component: 'cw-avatar',
  tags: ['autodocs'],
  argTypes: {
    name: { control: 'text' },
    src: { control: 'text' },
    size: { control: 'number' },
    showOnline: { control: 'boolean' },
    bgColor: { control: 'color' },
    textColor: { control: 'color' },
  },
};

export const TextInitials = {
  args: {
    name: 'Sarah Connor',
    size: 44,
    showOnline: true,
    bgColor: '#0b5fff',
    textColor: '#ffffff',
  },
  render: (args: any) => html`
    <cw-avatar
      .name="${args.name}"
      .size="${args.size}"
      .showOnline="${args.showOnline}"
      .bgColor="${args.bgColor}"
      .textColor="${args.textColor}"
    ></cw-avatar>
  `,
};

export const ImageAvatar = {
  args: {
    name: 'Sarah',
    src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    size: 44,
    showOnline: true,
  },
  render: (args: any) => html`
    <cw-avatar
      .name="${args.name}"
      .src="${args.src}"
      .size="${args.size}"
      .showOnline="${args.showOnline}"
    ></cw-avatar>
  `,
};
