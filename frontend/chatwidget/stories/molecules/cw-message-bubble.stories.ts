import { html } from 'lit';
import '../../components/molecules/cw-message-bubble.js';

export default {
  title: 'Molecules/MessageBubble',
  component: 'cw-message-bubble',
  tags: ['autodocs'],
  argTypes: {
    senderType: { control: 'select', options: ['AGENT', 'VISITOR'] },
    body: { control: 'text' },
    senderName: { control: 'text' },
    status: { control: 'select', options: ['pending', 'sent', 'delivered', 'read'] },
    isGroupStart: { control: 'boolean' },
    isGroupEnd: { control: 'boolean' },

    // Agent Controls
    agentBubbleBg: { control: 'color' },
    agentBubbleColor: { control: 'color' },
    agentBubbleBorderColor: { control: 'color' },
    agentBubbleBorderRadius: { control: 'text' },
    agentBubblePadding: { control: 'text' },
    agentBubbleFontSize: { control: 'text' },
    agentBubbleBoxShadow: { control: 'text' },
    agentAvatarBg: { control: 'color' },
    agentAvatarColor: { control: 'color' },
    agentAvatarUrl: { control: 'text' },

    // Visitor Controls
    visitorBubbleBg: { control: 'text' },
    visitorBubbleColor: { control: 'color' },
    visitorBubbleBorderRadius: { control: 'text' },
    visitorBubblePadding: { control: 'text' },
    visitorBubbleFontSize: { control: 'text' },
  },
};

export const AgentMessage = {
  args:{
    senderType:'AGENT',
    senderName:'Alex',
    body:"Hello! How can I help you today?",
    isGroupStart:true,
    isGroupEnd:true,
    agentBubbleBg:'#ffffff',
    agentBubbleColor:'#1e293b',
    agentBubbleBorderColor:'#e2e8f0',
    agentBubbleBorderRadius:'16px',
    agentBubblePadding:'10px 14px',
    agentBubbleFontSize:'14px',
    agentBubbleBoxShadow:'0 1px 3px rgba(0, 0, 0, 0.08)',
    agentAvatarBg:"#000000",
    agentAvatarColor:'#ffffff',
    agentAvatarUrl:'',
  },
  render:(args: any) => {
    const chatWindowConfig = {
      agentBubbleBg:args.agentBubbleBg,
      agentBubbleColor:args.agentBubbleColor,
      agentBubbleBorderColor:args.agentBubbleBorderColor,
      agentBubbleBorderRadius:args.agentBubbleBorderRadius,
      agentBubblePadding:args.agentBubblePadding,
      agentBubbleFontSize:args.agentBubbleFontSize,
      agentBubbleBoxShadow:args.agentBubbleBoxShadow,
      agentAvatarBg:args.agentAvatarBg,
      agentAvatarColor:args.agentAvatarColor,
      agentAvatarUrl:args.agentAvatarUrl,
    };
    return html`
      <div style="width: 350px; padding: 24px; background: #f8fafc; border-radius: 16px;">
        <cw-message-bubble
          .message="${{
            key:'m1',
            senderType:args.senderType,
            senderName:args.senderName,
            body:args.body,
            created:new Date().toISOString(),
          }}"
          .agentName="${args.senderName}"
          .isGroupStart="${args.isGroupStart}"
          .isGroupEnd="${args.isGroupEnd}"
          .chatWindowConfig="${chatWindowConfig}"
        ></cw-message-bubble>
      </div>
    `;
  },
};

export const VisitorMessage = {
  args:{
    senderType:'VISITOR',
    body:'I would like to know more about your pricing plans.',
    status:'read',
    isGroupStart:true,
    isGroupEnd:true,
    visitorBubbleBg:"#0b5fff",
    visitorBubbleColor:"#ffffff",
    visitorBubbleBorderRadius:'16px',
    visitorBubblePadding:'10px 14px',
    visitorBubbleFontSize:'14px',
  },
  render:(args: any) => {
    const chatWindowConfig = {
      visitorBubbleBg:args.visitorBubbleBg,
      visitorBubbleColor:args.visitorBubbleColor,
      visitorBubbleBorderRadius:args.visitorBubbleBorderRadius,
      visitorBubblePadding:args.visitorBubblePadding,
      visitorBubbleFontSize:args.visitorBubbleFontSize,
    };
    return html`
      <div style="width: 350px; padding: 24px; background: #f8fafc; border-radius: 16px;">
        <cw-message-bubble
          .message="${{
            key:'m2',
            senderType:args.senderType,
            body:args.body,
            created:new Date().toISOString(),
            status:args.status,
          }}"
          .isGroupStart="${args.isGroupStart}"
          .isGroupEnd="${args.isGroupEnd}"
          .chatWindowConfig="${chatWindowConfig}"
        ></cw-message-bubble>
      </div>
    `;
  },
};

