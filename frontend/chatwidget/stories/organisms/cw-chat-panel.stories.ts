import { html } from 'lit';
import '../../components/organisms/cw-chat-panel.js';

export default {
  title: 'Organisms/ChatPanel',
  component: 'cw-chat-panel',
  tags: ['autodocs'],
  argTypes: {
    panelOpen: { control: 'boolean' },
    state: { control: 'select', options: ['active', 'welcome', 'prechat', 'postchat'] },
    clientName: { control: 'text' },
    agentName: { control: 'text' },
    widgetWidth: { control: { type: 'number', min: 280, max: 500 } },
    widgetHeight: { control: { type: 'number', min: 400, max: 700 } },
    headerBg: { control: 'color' },
    bodyBg: { control: 'color' },
  },
};

export const ConfigurableChatPanel = {
  args: {
    panelOpen: true,
    state: 'active',
    clientName: 'Zotly Support',
    agentName: 'Sarah',
    widgetWidth: 350,
    widgetHeight: 520,
    headerBg: '#0b5fff',
    bodyBg: '#f8fafc',
  },
  render: (args: any) => {
    const chatWindowConfig = {
      widgetWidth: args.widgetWidth,
      widgetHeight: args.widgetHeight,
      headerBg: args.headerBg,
      bodyBg: args.bodyBg,
      accentColor: args.headerBg,
    };
    const chatState = {
      state: args.state,
      clientName: args.clientName,
      agentName: args.agentName,
      messages: [
        { key: 'm1', senderType: 'AGENT' as const, senderName: args.agentName, body: 'Welcome! How can we assist you today?', created: new Date().toISOString() },
      ],
    };
    return html`
      <div style="position: relative; width: 400px; height: 560px;">
        <cw-chat-panel
          .fixed="${false}"
          .panelOpen="${args.panelOpen}"
          .chatWindowConfig="${chatWindowConfig}"
          .chatState="${chatState}"
        ></cw-chat-panel>
      </div>
    `;
  },
};

