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

const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans'
});

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono'
});

const fontGoogleSansFlex = Google_Sans_Flex({
  subsets: ['latin'],
  variable: '--font-google-sans-flex',
  // Next.js has no fallback metrics for this font — it warns on every compile
  // and skips the fallback anyway, so opt out explicitly to silence it.
  adjustFontFallback: false
});

const fontSourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  variable: '--font-source-code-pro'
});

const fontInter = Inter({
  subsets: ['latin'],
  variable: '--font-inter'
});

const fontArchitectsDaughter = Architects_Daughter({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-architects-daughter'
});

const fontFiraCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-fira-code'
});

const fontOutfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit'
});

const fontJetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono'
});

const fontMerriweather = Merriweather({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-merriweather'
});

const fontPlayfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair-display'
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
