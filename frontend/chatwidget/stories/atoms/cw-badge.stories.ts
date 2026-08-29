import { html } from 'lit';
import '../../components/atoms/cw-badge.js';

export default {
  title: 'Atoms/Badge',
  component: 'cw-badge',
  tags: ['autodocs'],
  argTypes: {
    count: { control: { type: 'number', min: 1, max: 999 } },
    position: {
      control: 'select',
      options: ['relative', 'top-right', 'top-left', 'bottom-right', 'bottom-left'],
    },
    offsetX: { control: { type: 'number', min: -30, max: 30 } },
    offsetY: { control: { type: 'number', min: -30, max: 30 } },
    size: { control: { type: 'number', min: 12, max: 40 } },
    fontSize: { control: { type: 'number', min: 8, max: 20 } },
    backgroundColor: { control: 'color' },
    textColor: { control: 'color' },
    borderWidth: { control: { type: 'number', min: 0, max: 8 } },
    borderColor: { control: 'color' },
    boxShadow: { control: 'color' },
    borderRadius: { control: { type: 'number', min: 0, max: 9999 } },
    fontWeight: { control: 'select', options: ['400', '500', '600', '700', '800', '900'] },
    padding: { control: { type: 'number', min: 0, max: 20 } },
    animation: {
      control: 'select',
      options: [
        'pulse 1.5s infinite',
        'pulse',
        'bounce 1s infinite',
        'bounce',
        'wiggle 2.5s infinite',
        'wiggle',
        'none',
      ],
    },
  },
};

export const ConfigurableBadge = {
  args: {
    count: 3,
    position: 'top-right',
    offsetX: -4,
    offsetY: -4,
    size: 24,
    fontSize: 12,
    backgroundColor: '#dc2626',
    textColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#ffffff',
    boxShadow: '#00000040',
    borderRadius: 9999,
    fontWeight: '700',
    padding: 0,
    animation: 'pulse 1.5s infinite',
  },
  render: (args: any) => html`
    <div style="padding: 40px; display: flex; justify-content: center; align-items: center; background: #f8fafc; border-radius: 12px; border: 1px dashed #e2e8f0;">
      <!-- Dotted circle placeholder showing position relative to host target -->
      <div
        style="
          position: relative;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 2px dotted #94a3b8;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
        "
      >
        <cw-badge
          .count="${args.count}"
          .config="${{
            position: args.position,
            offsetX: args.offsetX,
            offsetY: args.offsetY,
            size: args.size,
            fontSize: args.fontSize,
            backgroundColor: args.backgroundColor,
            textColor: args.textColor,
            borderWidth: args.borderWidth,
            borderColor: args.borderColor,
            boxShadow: args.boxShadow,
            borderRadius: args.borderRadius,
            fontWeight: args.fontWeight,
            padding: args.padding,
            animation: args.animation,
          }}"
        ></cw-badge>
      </div>
    </div>
  `,
};

export const PositionsOverview = {
  render: () => html`
    <div style="display: flex; gap: 36px; padding: 40px; background: #f8fafc; border-radius: 12px; border: 1px dashed #e2e8f0; flex-wrap: wrap; justify-content: center;">
      <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
        <span style="font-size: 12px; font-weight: 600; color: #64748b;">Top Right</span>
        <div style="position: relative; width: 56px; height: 56px; border-radius: 50%; border: 2px dotted #6366f1; background: transparent; display: flex; align-items: center; justify-content: center;">
          <cw-badge .count="${5}" .position="${'top-right'}"></cw-badge>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
        <span style="font-size: 12px; font-weight: 600; color: #64748b;">Top Left</span>
        <div style="position: relative; width: 56px; height: 56px; border-radius: 50%; border: 2px dotted #0891b2; background: transparent; display: flex; align-items: center; justify-content: center;">
          <cw-badge .count="${12}" .position="${'top-left'}"></cw-badge>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
        <span style="font-size: 12px; font-weight: 600; color: #64748b;">Bottom Right</span>
        <div style="position: relative; width: 56px; height: 56px; border-radius: 50%; border: 2px dotted #059669; background: transparent; display: flex; align-items: center; justify-content: center;">
          <cw-badge .count="${99}" .position="${'bottom-right'}"></cw-badge>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
        <span style="font-size: 12px; font-weight: 600; color: #64748b;">Bottom Left</span>
        <div style="position: relative; width: 56px; height: 56px; border-radius: 50%; border: 2px dotted #d97706; background: transparent; display: flex; align-items: center; justify-content: center;">
          <cw-badge .count="${3}" .position="${'bottom-left'}"></cw-badge>
        </div>
      </div>

    </div>
  `,
};


