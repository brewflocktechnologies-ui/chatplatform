import { html } from 'lit';
import '../../components/organisms/cw-chat-header.js';

export default {
  title: 'Organisms/ChatHeader',
  component: 'cw-chat-header',
  tags: ['autodocs'],
  argTypes: {
    clientName: { control: 'text' },
    agentName: { control: 'text' },
    state: { control: 'select', options: ['active', 'welcome', 'prechat', 'postchat'] },
    isExpanded: { control: 'boolean' },

    headerBg: { control: 'color' },
    headerTextColor: { control: 'color' },
    headerBorderColor: { control: 'color' },
    headerPadding: { control: 'text' },
    headerTitleFontSize: { control: 'text' },
    headerSubtitleFontSize: { control: 'text' },

    headerAvatarBg: { control: 'color' },
    headerAvatarColor: { control: 'color' },

    activeDotColor: { control: 'color' },
    activeDotAnimate: { control: 'boolean' },
    activeDotSize: { control: 'number' },
    activeDotBorderWidth: { control: 'number' },
    activeDotBorderColor: { control: 'color' },

    modernUi: { control: 'boolean', name: 'Modern UI (expand + menu buttons)' },
    enableVoiceCall: { control: 'boolean', name: 'Show Voice Call Button' },
    enableVideoCall: { control: 'boolean', name: 'Show Video Call Button' },
    enableCloseChatVisitor: { control: 'boolean', name: 'Show Close Button' },
  },
};

export const ConfigurableHeader = {
  args: {
    clientName: 'Zotly Support',
    agentName: 'Sarah',
    state: 'active',
    isExpanded: false,

    headerBg: '#0b5fff',
    headerTextColor: '#ffffff',
    headerBorderColor: '#ffffff',
    headerPadding: '14px 16px',
    headerTitleFontSize: '14px',
    headerSubtitleFontSize: '11px',

    headerAvatarBg: 'rgba(255,255,255,0.2)',
    headerAvatarColor: '#ffffff',

    activeDotColor: '#22c55e',
    activeDotAnimate: true,
    activeDotSize: 8,
    activeDotBorderWidth: 0,
    activeDotBorderColor: '#ffffff',

    modernUi: true,
    enableVoiceCall: true,
    enableVideoCall: true,
    enableCloseChatVisitor: true,
  },
  render: (args: any) => {
    return html`
      <div style="width: 350px; border-radius: 16px 16px 0 0; overflow: hidden;">
        <cw-chat-header
          .clientName="${args.clientName}"
          .agentName="${args.agentName}"
          .state="${args.state}"
          .isExpanded="${args.isExpanded}"
          .config="${{
            headerBg: args.headerBg,
            headerTextColor: args.headerTextColor,
            headerBorderColor: args.headerBorderColor,
            headerPadding: args.headerPadding,
            headerTitleFontSize: args.headerTitleFontSize,
            headerSubtitleFontSize: args.headerSubtitleFontSize,
            headerAvatarBg: args.headerAvatarBg,
            headerAvatarColor: args.headerAvatarColor,
            modernUi: args.modernUi,
            activeDot: {
              color: args.activeDotColor,
              animate: args.activeDotAnimate,
              size: args.activeDotSize,
              borderWidth: args.activeDotBorderWidth,
              borderColor: args.activeDotBorderColor,
            },
          }}"
          .features="${{
            voiceCallMaster: args.enableVoiceCall,
            videoCallMaster: args.enableVideoCall,
            closeChatVisitor: args.enableCloseChatVisitor,
          }}"
        ></cw-chat-header>
      </div>
    `;
  },
};
