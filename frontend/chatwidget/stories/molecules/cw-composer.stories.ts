import { html } from 'lit';
import '../../components/molecules/cw-composer.js';

export default {
  title: 'Molecules/Composer',
  component: 'cw-composer',
  tags: ['autodocs'],
  argTypes: {
    /* Content & Feature Flags */
    draft: { control: 'text', description: 'Current draft message text' },
    attachmentsEnabled: { control: 'boolean', description: 'Show attachment (+) button' },
    modernUi: { control: 'boolean', description: 'Show emoji (😊) button' },
    uploading: { control: 'boolean', description: 'Disable attachment button while uploading' },
    sendIconType: {
      control: { type: 'select', options: ['', 'send', 'arrow'] },
      description: 'Icon style for send button ("arrow" up icon vs default "send" paper plane)',
    },

    /* Container & Input Styling */
    inputBg: { control: 'color', description: 'Background color of the composer container' },
    inputTextColor: { control: 'color', description: 'Text color of the textarea' },
    inputPlaceholderColor: { control: 'color', description: 'Placeholder text color' },
    inputBorderColor: { control: 'color', description: 'Default border color' },
    inputFocusBorderColor: { control: 'color', description: 'Border color when composer is focused' },
    inputFocusShadow: { control: 'text', description: 'Box shadow when composer is focused' },
    inputPadding: { control: 'text', description: 'Composer padding CSS string' },
    inputMargin: { control: 'text', description: 'Composer margin CSS string' },
    inputBorderRadius: { control: { type: 'number', min: 0, max: 50 }, description: 'Border radius (px or CSS string)' },
    textareaFontSize: { control: 'text', description: 'Font size of text input (e.g. 14px)' },
    accentColor: { control: 'color', description: 'Fallback theme accent color' },

    /* Action Button Styling */
    attachButtonBg: { control: 'color', description: 'Background color of attachment button' },
    attachButtonColor: { control: 'color', description: 'Icon color of attachment button' },
    emojiButtonColor: { control: 'color', description: 'Icon color of emoji button' },
    sendButtonBgActive: { control: 'color', description: 'Background of send button when text is entered' },
    sendButtonColorActive: { control: 'color', description: 'Icon color of send button when active' },
    sendButtonBgInactive: { control: 'color', description: 'Background of send button when inactive' },
    sendButtonColorInactive: { control: 'color', description: 'Icon color of send button when inactive' },
  },
};

const renderComposer = (args: any) => html`
  <div style="width: 380px; padding: 16px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 16px;">
    <cw-composer
      .draft="${args.draft || ''}"
      ?attachmentsEnabled="${args.attachmentsEnabled}"
      ?modernUi="${args.modernUi}"
      ?uploading="${args.uploading}"
      .sendIconType="${args.sendIconType || ''}"
      .inputBg="${args.inputBg || ''}"
      .inputTextColor="${args.inputTextColor || ''}"
      .inputPlaceholderColor="${args.inputPlaceholderColor || ''}"
      .inputBorderColor="${args.inputBorderColor || ''}"
      .inputFocusBorderColor="${args.inputFocusBorderColor || ''}"
      .inputFocusShadow="${args.inputFocusShadow || ''}"
      .inputPadding="${args.inputPadding || ''}"
      .inputMargin="${args.inputMargin || ''}"
      .inputBorderRadius="${args.inputBorderRadius}"
      .textareaFontSize="${args.textareaFontSize || ''}"
      .attachButtonBg="${args.attachButtonBg || ''}"
      .attachButtonColor="${args.attachButtonColor || ''}"
      .emojiButtonColor="${args.emojiButtonColor || ''}"
      .sendButtonBgActive="${args.sendButtonBgActive || ''}"
      .sendButtonColorActive="${args.sendButtonColorActive || ''}"
      .sendButtonBgInactive="${args.sendButtonBgInactive || ''}"
      .sendButtonColorInactive="${args.sendButtonColorInactive || ''}"
      .accentColor="${args.accentColor || ''}"
    ></cw-composer>
  </div>
`;

export const DefaultComposer = {
  args: {
    draft: '',
    attachmentsEnabled: true,
    modernUi: true,
    uploading: false,
    sendIconType: 'arrow',
  },
  render: renderComposer,
};

export const WithDraftText = {
  args: {
    draft: 'Hello! I have a question about my order.',
    attachmentsEnabled: true,
    modernUi: true,
    sendIconType: 'arrow',
    sendButtonBgActive: '#0b5fff',
    sendButtonColorActive: '#ffffff',
  },
  render: renderComposer,
};

export const CustomStyledTheme = {
  args: {
    draft: 'Custom styled composer with purple accent',
    attachmentsEnabled: true,
    modernUi: true,
    sendIconType: 'arrow',
    inputBg: '#ffffff',
    inputTextColor: '#0f172a',
    inputPlaceholderColor: '#94a3b8',
    inputBorderColor: '#cbd5e1',
    inputFocusBorderColor: '#8b5cf6',
    inputBorderRadius: 24,
    attachButtonBg: '#f3e8ff',
    attachButtonColor: '#7c3aed',
    emojiButtonColor: '#7c3aed',
    sendButtonBgActive: '#7c3aed',
    sendButtonColorActive: '#ffffff',
  },
  render: renderComposer,
};

export const PaperPlaneIconStyle = {
  args: {
    draft: 'Using paperplane icon variant',
    attachmentsEnabled: true,
    modernUi: true,
    sendIconType: 'send',
    sendButtonBgActive: '#059669',
    sendButtonColorActive: '#ffffff',
  },
  render: renderComposer,
};


