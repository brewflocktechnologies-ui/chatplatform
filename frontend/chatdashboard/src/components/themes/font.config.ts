import {
  Architects_Daughter,
  Fira_Code,
  Geist,
  Geist_Mono,
  Google_Sans_Flex,
  Inter,
  JetBrains_Mono,
  Merriweather,
  Outfit,
  Playfair_Display,
  Source_Code_Pro
} from 'next/font/google';

import { cn } from '@/lib/utils';

// Only the default theme's font (Geist, `--font-sans`) is preloaded. The others are declared with
// `preload: false`: they are fetched on demand when a theme actually renders text with them,
// instead of being downloaded (and competing with the page's JS and CSS) on every page load.
const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans'
});

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  preload: false
});

const fontGoogleSansFlex = Google_Sans_Flex({
  subsets: ['latin'],
  variable: '--font-google-sans-flex',
  preload: false,
  // Next.js has no fallback metrics for this font — it warns on every compile
  // and skips the fallback anyway, so opt out explicitly to silence it.
  adjustFontFallback: false,
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif']
});

const fontSourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  variable: '--font-source-code-pro',
  preload: false
});

const fontInter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  preload: false
});

const fontArchitectsDaughter = Architects_Daughter({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-architects-daughter',
  preload: false
});

const fontFiraCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-fira-code',
  preload: false
});

const fontOutfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  preload: false
});

const fontJetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  preload: false
});

const fontMerriweather = Merriweather({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-merriweather',
  preload: false
});

const fontPlayfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair-display',
  preload: false
});

export const fontVariables = cn(
  fontSans.variable,
  fontMono.variable,
  fontGoogleSansFlex.variable,
  fontSourceCodePro.variable,
  fontInter.variable,
  fontArchitectsDaughter.variable,
  fontFiraCode.variable,
  fontOutfit.variable,
  fontJetBrainsMono.variable,
  fontMerriweather.variable,
  fontPlayfairDisplay.variable
);
