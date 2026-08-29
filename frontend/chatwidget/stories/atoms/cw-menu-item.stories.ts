import { html } from 'lit';
import '../../components/atoms/cw-menu-item.js';
import { ICON_ARG_TYPE } from '../utils/icon-options.js';

export default {
  title: 'Atoms/MenuItem',
  component: 'cw-menu-item',
  tags: ['autodocs'],
  argTypes: {
    icon: ICON_ARG_TYPE,
    label: { control: 'text' },
    iconSize: { control: { type: 'number', min: 12, max: 32 } },
  },
};

export const Default = {
  args: {
    icon: 'Image',
    label: 'Send an image',
    iconSize: 16,
  },
  render: (args: any) => html`
    <div style="width: 200px; background: #ffffff; padding: 4px; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);">
      <cw-menu-item .icon="${args.icon}" .label="${args.label}" .iconSize="${args.iconSize}"></cw-menu-item>
    </div>
  `,
};

export const MultipleItems = {
  render: () => html`
    <div style="width: 200px; background: #ffffff; padding: 4px; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);">
      <cw-menu-item icon="Image" label="Send an image"></cw-menu-item>
      <cw-menu-item icon="Camera" label="Add screenshot"></cw-menu-item>
      <cw-menu-item icon="Download" label="Download transcript"></cw-menu-item>
      <cw-menu-item icon="Volume2" label="Sounds: ON"></cw-menu-item>
    </div>
  `,
};
