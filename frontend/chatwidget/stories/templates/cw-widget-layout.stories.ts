import { html } from 'lit';
import '../../components/templates/cw-widget-layout.js';

export default {
  title: 'Templates/WidgetLayout',
  component: 'cw-widget-layout',
  args: {
    panelOpen: true,
    unreadCount: 2,
    hasSentMessage: false,
  },
};

export const DefaultLayout = {
  args: {
    panelOpen: true,
    unreadCount: 0,
  },
  render: (args: any) => html`
    <div style="position: relative; min-height: 600px; width: 100%;">
      <cw-widget-layout
        .panelOpen="${args.panelOpen}"
        .unreadCount="${args.unreadCount}"
        .bubbleConfig="${{ offsetRight: 16, offsetBottom: 12, backgroundColor: '#0b5fff' }}"
        .chatWindowConfig="${{ clientName: 'Demo Store Support', widgetWidth: 380, widgetHeight: 560 }}"
        .chatState="${{
          state: 'active',
          messages: [
            { id: '1', senderType: 'AGENT', text: 'Hello! How can we help you today?', timestamp: Date.now() - 60000 }
          ]
        }}"
      ></cw-widget-layout>
    </div>
  `,
};
