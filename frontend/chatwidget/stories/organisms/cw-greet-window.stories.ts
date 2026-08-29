import { html } from 'lit';
import '../../components/organisms/cw-greet-window.js';

export default {
  title: 'Organisms/GreetWindow',
  component: 'cw-greet-window',
  tags: ['autodocs'],
  argTypes: {
    panelOpen: { control: 'boolean' },
    enabled: { control: 'boolean' },
    title: { control: 'text' },
    description: { control: 'text' },
    titleColor: { control: 'color' },
    descriptionColor: { control: 'color' },
    backgroundColor: { control: 'color' },
    borderRadius: { control: { type: 'number', min: 0, max: 32 } },
    padding: { control: 'text' },
    width: { control: { type: 'number', min: 240, max: 420 } },
    lucideIcon: { control: 'text' },
    iconSize: { control: { type: 'number', min: 20, max: 64 } },
    iconColor: { control: 'color' },
    iconAnimation: { control: 'select', options: ['wiggle', 'pulse', 'bounce', 'none'] },
    imageUrl: { control: 'text' },

    // Input box controls
    enableInputBox: { control: 'boolean', name: 'Enable Input Box' },
    inputLayout: { control: 'select', options: ['separated', 'joined'], name: 'Input Box Layout' },
    inputPlaceholder: { control: 'text', name: 'Input Placeholder' },
    buttonColor: { control: 'color', name: 'Input Button Color' },
    buttonIconColor: { control: 'color', name: 'Input Button Icon Color' },
  },
};

export const ConfigurableGreetWindow = {
  args:{
    panelOpen:false,
    enabled:true,
    title:"Hi there! 👋 Need using AI?",
    description:"Let's chat & find the right solution for you!",
    titleColor:'#1e293b',
    descriptionColor:"#475569",
    backgroundColor:'#ffffff',
    borderRadius:16,
    padding:'24px 20px',
    width:320,
    lucideIcon:'Sparkles',
    iconSize:48,
    iconColor:'#0b5fff',
    iconAnimation:'wiggle',
    imageUrl:'',
    enableInputBox:true,
    inputLayout:"joined",
    inputPlaceholder:'Write your message...',
    buttonColor:'#0b5fff',
    buttonIconColor:'#ffffff',
  },
  render:(args: any) => {
    const config: any = {
      enabled:args.enabled,
      dismissed:false,
      visible:true,
      width:args.width,
      backgroundColor:args.backgroundColor,
      borderRadius:args.borderRadius,
      padding:args.padding,
      title:args.title,
      description:args.description,
      titleColor:args.titleColor,
      descriptionColor:args.descriptionColor,
      lucideIcon:args.lucideIcon,
      iconSize:args.iconSize,
      iconColor:args.iconColor,
      iconAnimation:args.iconAnimation,
      imageUrl:args.imageUrl || undefined,
      inputBox:args.enableInputBox ? {
        enabled:true,
        visible:true,
        layout:args.inputLayout,
        placeholder:args.inputPlaceholder,
        buttonColor:args.buttonColor,
        buttonIconColor:args.buttonIconColor,
      } : undefined,
    };
    return html`
      <div style="position: relative; width: 380px; height: 440px;">
        <cw-greet-window
          .fixed="${false}"
          .panelOpen="${args.panelOpen}"
          .config="${config}"
        ></cw-greet-window>
      </div>
    `;
  },
};

