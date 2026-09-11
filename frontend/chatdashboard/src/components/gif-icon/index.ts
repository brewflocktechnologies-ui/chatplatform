import { createGifIcon } from './create-gif-icon';

/**
 * GIF icons
 *
 * Normal: static SVG
 * Hover: animated GIF, restarted on every hover
 */
export const TeamIconGif = createGifIcon(
  '/gif-icons/team.gif',
  '/static-icons/team.svg',
);

export const MessageIconGif = createGifIcon(
  '/gif-icons/message.gif',
  '/static-icons/message.svg',
);
