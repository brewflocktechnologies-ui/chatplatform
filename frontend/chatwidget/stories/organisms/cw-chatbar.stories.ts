import { html } from 'lit';
import '../../components/organisms/cw-chatbar.js';
import { CHATBAR_BAR_PRESET, CHATBAR_CARD_PRESET } from '../../config/chatbar-presets.js';
import { ICON_ARG_TYPE } from '../utils/icon-options.js';

export default {
  title: 'Organisms/Chatbar',
  component: 'cw-chatbar',
  tags: ['autodocs'],
  argTypes: {
    unreadCount: { control: { type: 'number', min: 0, max: 99 } },
    layout: { control: 'select', options: ['bar', 'card'], description: 'Switch between horizontal floating bar and vertical card trigger' },
    text: { control: 'text' },
    cardText: { control: 'text' },
    buttonText: { control: 'text' },
    bgColor: { control: 'color' },
    textColor: { control: 'color' },
    buttonBg: { control: 'color' },
    buttonTextColor: { control: 'color' },
    textSize: { control: { type: 'number', min: 12, max: 24 } },
    lucideIcon: ICON_ARG_TYPE,
    iconWidth: { control: { type: 'number', min: 14, max: 48 } },
    iconHeight: { control: { type: 'number', min: 14, max: 48 } },
    shadow: { control: 'boolean' },
  },
};

export const BarPreset = {
  args:{
    unreadCount:1,
    layout:'bar',
    text:'Chat with us',
    cardText:'Questions about AI solutions?',
    buttonText:'Chat Now',
    bgColor:"#0b5fff",
    textColor:'#ffffff',
    buttonBg:'#ffffff',
    buttonTextColor:"#0b5fff",
    textSize:16,
    lucideIcon:"MessageSquare",
    iconWidth:36,
    iconHeight:36,
    shadow:true,
  },
  render:(args: any) => {
    const isCard = args.layout === 'card';
    const config: any = {
      ...CHATBAR_BAR_PRESET,
      layout: args.layout,
      text: args.text,
      cardText: args.cardText,
      buttonText: args.buttonText,
      bgColor: args.bgColor,
      textColor: args.textColor,
      buttonBg: args.buttonBg,
      buttonTextColor: args.buttonTextColor,
      textSize: args.textSize,
      lucideIcon: args.lucideIcon,
      iconWidth: args.iconWidth,
      iconHeight: args.iconHeight,
      width: isCard ? CHATBAR_CARD_PRESET.width : 255,
      height: isCard ? CHATBAR_CARD_PRESET.height : 40,
      borderRadius: isCard ? CHATBAR_CARD_PRESET.borderRadius : CHATBAR_BAR_PRESET.borderRadius,
      padding: isCard ? CHATBAR_CARD_PRESET.padding : CHATBAR_BAR_PRESET.padding,
      gap: isCard ? CHATBAR_CARD_PRESET.gap : CHATBAR_BAR_PRESET.gap,
      shadow: args.shadow,
      offsetRight: 16,
      offsetBottom: 16,
    };
    return html`
      <div style="position: relative; width: ${isCard ? '280px' : '300px'}; height: ${isCard ? '300px' : '120px'};">
        <cw-chatbar
          .fixed="${false}"
          .unreadCount="${args.unreadCount}"
          .config="${config}"
        ></cw-chatbar>
      </div>
    `;
  },
};

export const CardPreset = {
  args: {
    unreadCount: 0,
    layout: 'card',
    text: 'Chat with us',
    cardText: 'Questions about PhonePe for business?',
    buttonText: 'Chat Now',
    bgColor: '#5f259f',
    textColor: '#ffffff',
    buttonBg: '#ffffff',
    buttonTextColor: '#5f259f',
    textSize: 16,
    lucideIcon: 'Sparkles',
    iconWidth: 36,
    iconHeight: 36,
    shadow: true,
  },
  render: (args: any) => {
    const isCard = args.layout === 'card';
    const config: any = {
      ...CHATBAR_CARD_PRESET,
      layout: args.layout,
      text: args.text,
      cardText: args.cardText,
      buttonText: args.buttonText,
      bgColor: args.bgColor,
      textColor: args.textColor,
      buttonBg: args.buttonBg,
      buttonTextColor: args.buttonTextColor,
      textSize: args.textSize,
      lucideIcon: args.lucideIcon,
      iconWidth: args.iconWidth,
      iconHeight: args.iconHeight,
      width: isCard ? CHATBAR_CARD_PRESET.width : 255,
      height: isCard ? CHATBAR_CARD_PRESET.height : 40,
      borderRadius: isCard ? CHATBAR_CARD_PRESET.borderRadius : CHATBAR_BAR_PRESET.borderRadius,
      padding: isCard ? CHATBAR_CARD_PRESET.padding : CHATBAR_BAR_PRESET.padding,
      gap: isCard ? CHATBAR_CARD_PRESET.gap : CHATBAR_BAR_PRESET.gap,
      shadow: args.shadow,
      offsetRight: 16,
      offsetBottom: 16,
    };
    return html`
      <div style="position: relative; width: ${isCard ? '280px' : '300px'}; height: ${isCard ? '300px' : '120px'};">
        <cw-chatbar
          .fixed="${false}"
          .unreadCount="${args.unreadCount}"
          .config="${config}"
        ></cw-chatbar>
      </div>
    `;
  },
};

