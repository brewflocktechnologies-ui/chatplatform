import { html } from 'lit';
import '../../components/molecules/cw-confirm-dialog.js';

const DEFAULT_CONFIRM_ARGS = {
  message: 'Are you sure you want to end this chat?',
  cancelLabel: 'Cancel',
  confirmLabel: 'Confirm',
  modalCardBg: '#ffffff',
  modalMessageColor: '#18181b',
  modalBorderRadius: 16,
  cancelBg: '#f1f5f9',
  cancelTextColor: '#64748b',
  cancelBorderColor: '#e2e8f0',
  confirmBg: '#0b5fff',
  confirmTextColor: '#ffffff',
};

export default {
  title: 'Molecules/ConfirmDialog',
  component: 'cw-confirm-dialog',
  tags: ['autodocs'],
  args: DEFAULT_CONFIRM_ARGS,
  argTypes: {
    message: { control: 'text' },
    cancelLabel: { control: 'text' },
    confirmLabel: { control: 'text' },
    modalCardBg: { control: 'color' },
    modalMessageColor: { control: 'color' },
    modalBorderRadius: { control: { type: 'number', min: 0, max: 32 } },
    cancelBg: { control: 'color' },
    cancelTextColor: { control: 'color' },
    cancelBorderColor: { control: 'color' },
    confirmBg: { control: 'color' },
    confirmTextColor: { control: 'color' },
  },
};

export const Default = {
  args: DEFAULT_CONFIRM_ARGS,
  render: (args: any) => html`
    <div style="position: relative; height: 300px; width: 360px; background: #f8fafc; overflow: hidden; border-radius: 16px; border: 1px solid #e2e8f0;">
      <cw-confirm-dialog
        .message="${args.message}"
        .cancelLabel="${args.cancelLabel}"
        .confirmLabel="${args.confirmLabel}"
        .modalCardBg="${args.modalCardBg}"
        .modalMessageColor="${args.modalMessageColor}"
        .modalBorderRadius="${args.modalBorderRadius}"
        .cancelBg="${args.cancelBg}"
        .cancelTextColor="${args.cancelTextColor}"
        .cancelBorderColor="${args.cancelBorderColor}"
        .confirmBg="${args.confirmBg}"
        .confirmTextColor="${args.confirmTextColor}"
      ></cw-confirm-dialog>
    </div>
  `,
};

export const CustomLabels = {
  args: {
    ...DEFAULT_CONFIRM_ARGS,
    message: 'End session and download transcript?',
    cancelLabel: 'Keep Chatting',
    confirmLabel: 'End & Save',
    confirmBg: '#ef4444',
  },
  render: (args: any) => html`
    <div style="position: relative; height: 300px; width: 360px; background: #0f172a; overflow: hidden; border-radius: 16px;">
      <cw-confirm-dialog
        .message="${args.message}"
        .cancelLabel="${args.cancelLabel}"
        .confirmLabel="${args.confirmLabel}"
        .modalCardBg="${args.modalCardBg}"
        .modalMessageColor="${args.modalMessageColor}"
        .modalBorderRadius="${args.modalBorderRadius}"
        .cancelBg="${args.cancelBg}"
        .cancelTextColor="${args.cancelTextColor}"
        .cancelBorderColor="${args.cancelBorderColor}"
        .confirmBg="${args.confirmBg}"
        .confirmTextColor="${args.confirmTextColor}"
      ></cw-confirm-dialog>
    </div>
  `,
};
