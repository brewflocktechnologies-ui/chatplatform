import { describe, it, expect } from 'vitest';
import {
  hexToRgba,
  getBorderRadius,
  getGradient,
  getBoxShadow,
  getInnerShadow,
  getCompositeBackground,
  getChatbarBackground,
  getChatbarFontSize,
  getChatbarIconWidth,
  getChatbarIconHeight,
  getTooltipBorderRadius,
  getAnimClass,
  formatTime,
} from '../../utils/style-helpers.js';

describe('utils/style-helpers.ts', () => {
  it('should convert hex colors to rgba properly', () => {
    expect(hexToRgba('', 1)).toBe('');
    expect(hexToRgba('red', 1)).toBe('red');
    expect(hexToRgba('#ffffff', 0.5)).toBe('rgba(255,255,255,0.5)');
    expect(hexToRgba('#000', 1)).toBe('rgba(0,0,0,1)');
  });

  it('should compute border radius correctly for numbers, objects, and fallbacks', () => {
    expect(getBorderRadius(16)).toBe('16px');
    expect(getBorderRadius({ tl: 10, tr: 12, br: 14, bl: 16 })).toBe('10px 12px 14px 16px');
    expect(getBorderRadius(undefined, '50%')).toBe('50%');
    expect(getBorderRadius('custom' as any)).toBe('50%');
  });

  it('should generate gradient string correctly', () => {
    const stops = [
      { color: '#ff0000', pos: 0 },
      { color: '#00ff00', pos: 100 },
    ];
    expect(getGradient('none', stops)).toBe('');
    expect(getGradient('linear', [])).toBe('#0b5fff');
    expect(getGradient('linear', stops, 90)).toBe('linear-gradient(90deg, #ff0000 0%, #00ff00 100%)');
    expect(getGradient('radial', stops)).toBe('radial-gradient(circle, #ff0000 0%, #00ff00 100%)');
    expect(getGradient('conic', stops, 45)).toBe('conic-gradient(from 45deg, #ff0000 0%, #00ff00 100%)');
  });

  it('should calculate box shadow string correctly', () => {
    expect(getBoxShadow({ boxShadowOpacity: 0 })).toBe('none');
    const shadow = getBoxShadow({ boxShadowOffsetY: 4, boxShadowBlur: 10, boxShadowOpacity: 0.2 });
    expect(shadow).toBe('0px 4px 10px 0px rgba(0,0,0,0.2)');
  });

  it('should calculate inner shadow string correctly', () => {
    expect(getInnerShadow({})).toBe('');
    expect(getInnerShadow({ innerShadow: { enabled: true, blur: 8, opacity: 0.3 } })).toBe(
      'inset 0 6px 8px rgba(0,0,0,0.3)'
    );
  });

  it('should compute composite background correctly', () => {
    expect(getCompositeBackground({ useWebsiteTheme: true, backgroundColor: '#9333ea' })).toBe('#9333ea');
    expect(
      getCompositeBackground({
        useWebsiteTheme: false,
        gradientType: 'linear',
        gradientStops: [{ color: 'red', pos: 0 }],
      })
    ).toBe('linear-gradient(135deg, red 0%)');
    expect(getCompositeBackground({ useWebsiteTheme: false })).toBe('#0b5fff');
  });

  it('should compute chatbar background correctly', () => {
    expect(getChatbarBackground({ useWebsiteTheme: true, accentColor: '#2563eb' })).toBe('#2563eb');
    expect(getChatbarBackground({ useWebsiteTheme: false, gradientEnabled: false, bgColor: '#111' })).toBe('#111');
    expect(
      getChatbarBackground({
        useWebsiteTheme: false,
        gradientEnabled: true,
        gradientType: 'linear',
        gradientStops: [{ color: 'blue', pos: 0 }],
      })
    ).toBe('linear-gradient(90deg, blue 0%)');
    expect(
      getChatbarBackground({
        useWebsiteTheme: false,
        gradientEnabled: true,
        gradientType: 'conic',
        gradientStops: [{ color: 'blue', pos: 0 }],
      })
    ).toBe('conic-gradient(from 90deg, blue 0%)');
    expect(
      getChatbarBackground({
        useWebsiteTheme: false,
        gradientEnabled: true,
        gradientType: 'radial',
        gradientStops: [{ color: 'blue', pos: 0 }],
      })
    ).toBe('radial-gradient(circle, blue 0%)');
    expect(
      getChatbarBackground({
        useWebsiteTheme: false,
        gradientEnabled: true,
        gradientType: 'unknown',
        gradientStops: [{ color: 'blue', pos: 0 }],
      })
    ).toBe('#007bff');
  });

  it('computes chatbar font size and icon dimensions', () => {
    expect(getChatbarFontSize(14, 40)).toBe('14px');
    expect(getChatbarIconWidth(20, 40, 'customSvg')).toBe(20);
    expect(getChatbarIconHeight(20, 40, 'customSvg')).toBe(20);
  });

  it('computes tooltip border radius', () => {
    expect(getTooltipBorderRadius({ tl: 10 }, 'left')).toBe('10px 20px 20px 20px');
    expect(getTooltipBorderRadius(15, 'left')).toBe('15px');
    expect(getTooltipBorderRadius('custom' as any, 'left')).toBe('custom');
    expect(getTooltipBorderRadius(undefined, 'left')).toBe('20px 20px 4px 20px');
    expect(getTooltipBorderRadius(undefined, 'right')).toBe('20px 20px 20px 4px');
    expect(getTooltipBorderRadius(undefined, 'top')).toBe('20px');
  });

  it('computes animation class and formats time', () => {
    expect(getAnimClass('wiggle')).toBe('anim-zotly-wiggle');
    expect(getAnimClass('none')).toBe('');
    expect(getAnimClass(undefined)).toBe('');

    expect(typeof formatTime(undefined)).toBe('string');
    expect(getCompositeBackground({ gradientType: 'linear', gradientStops: [] } as any)).toBe('#0b5fff');
    expect(getChatbarBackground({ gradientEnabled: true } as any)).toBe('#007bff');
  });

  it('covers remaining edge branches (invalid hex, innerShadow defaults, composite fallbacks, formatTime with date)', () => {
    // Invalid '#'-prefixed hex → non-parsable branch falls through to the original string
    expect(hexToRgba('#zzzzzz', 1)).toBe('#zzzzzz');

    // innerShadow enabled without blur/opacity → defaults 12 / 0.25
    expect(getInnerShadow({ innerShadow: { enabled: true } })).toBe('inset 0 6px 12px rgba(0,0,0,0.25)');

    // useWebsiteTheme with no backgroundColor → default accent
    expect(getCompositeBackground({ useWebsiteTheme: true })).toBe('#0b5fff');

    // gradient without gradientStops → empty stops fallback
    expect(getCompositeBackground({ useWebsiteTheme: false, gradientType: 'linear' })).toBe('#0b5fff');

    expect(typeof formatTime('2024-01-01T00:00:00.000Z')).toBe('string');
  });
});
