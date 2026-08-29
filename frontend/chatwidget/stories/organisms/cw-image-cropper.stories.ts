import { html } from 'lit';
import '../../components/organisms/cw-image-cropper.js';

export default {
  title: 'Organisms/ImageCropper',
  component: 'cw-image-cropper',
  tags: ['autodocs'],
  argTypes: {
    open: { control: 'boolean', description: 'Toggles visibility of the cropper modal overlay' },
    imageSrc: { control: 'text', description: 'Source URL or base64 data string of the image to crop' },
    titleText: { control: 'text', description: 'Modal header title text' },
    cropShape: {
      control: 'select',
      options: ['circle', 'square', 'rounded'],
      description: 'Shape of the crop guide mask overlay',
    },
    primaryColor: { control: 'color', description: 'Primary theme accent color for crop button and slider' },
    cancelText: { control: 'text', description: 'Cancel button label' },
    applyText: { control: 'text', description: 'Crop action button label' },
    showRotate: { control: 'boolean', description: 'Show 90° rotate button' },
    showAspectPills: { control: 'boolean', description: 'Show aspect ratio selection pills' },
    exportSize: { control: { type: 'number', min: 100, max: 800, step: 50 }, description: 'Target export width resolution in pixels' },
    backdropOpacity: { control: { type: 'number', min: 0, max: 1, step: 0.05 }, description: 'Backdrop dimming behind the modal (0 = transparent)' },
  },
};

const sampleImage = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';

export const ConfigurableCropperModal = {
  args: {
    open: true,
    imageSrc: sampleImage,
    titleText: 'Crop & Resize Image',
    cropShape: 'square',
    primaryColor: '#0b5fff',
    cancelText: 'Cancel',
    applyText: 'Crop & Apply',
    showRotate: true,
    showAspectPills: true,
    exportSize: 250,
    backdropOpacity: 0,
  },
  render: (args: any) => html`
    <div style="position: relative; width: 520px; height: 620px; background: #f1f5f9; border-radius: 20px; overflow: hidden;">
      <cw-image-cropper
        .fixed="${false}"
        .backdropOpacity="${args.backdropOpacity}"
        .open="${args.open}"
        .imageSrc="${args.imageSrc}"
        .titleText="${args.titleText}"
        .cropShape="${args.cropShape}"
        .primaryColor="${args.primaryColor}"
        .cancelText="${args.cancelText}"
        .applyText="${args.applyText}"
        .showRotate="${args.showRotate}"
        .showAspectPills="${args.showAspectPills}"
        .exportSize="${args.exportSize}"
      ></cw-image-cropper>
    </div>
  `,
};
