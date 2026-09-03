---
name: High-Energy Ticket Platform
colors:
  surface: '#131317'
  surface-dim: '#131317'
  surface-bright: '#39393d'
  surface-container-lowest: '#0e0e12'
  surface-container-low: '#1b1b1f'
  surface-container: '#1f1f24'
  surface-container-high: '#2a292e'
  surface-container-highest: '#353439'
  on-surface: '#e4e1e7'
  on-surface-variant: '#bbc9cf'
  inverse-surface: '#e4e1e7'
  inverse-on-surface: '#303034'
  outline: '#859399'
  outline-variant: '#3c494e'
  surface-tint: '#4cd6ff'
  primary: '#a4e6ff'
  on-primary: '#003543'
  primary-container: '#00d1ff'
  on-primary-container: '#00566a'
  inverse-primary: '#00677f'
  secondary: '#ebb2ff'
  on-secondary: '#520072'
  secondary-container: '#b600f8'
  on-secondary-container: '#fff6fc'
  tertiary: '#bded00'
  on-tertiary: '#283500'
  tertiary-container: '#a5cf00'
  on-tertiary-container: '#425500'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#b7eaff'
  primary-fixed-dim: '#4cd6ff'
  on-primary-fixed: '#001f28'
  on-primary-fixed-variant: '#004e60'
  secondary-fixed: '#f8d8ff'
  secondary-fixed-dim: '#ebb2ff'
  on-secondary-fixed: '#320047'
  on-secondary-fixed-variant: '#74009f'
  tertiary-fixed: '#c3f400'
  tertiary-fixed-dim: '#abd600'
  on-tertiary-fixed: '#161e00'
  on-tertiary-fixed-variant: '#3c4d00'
  background: '#131317'
  on-background: '#e4e1e7'
  surface-variant: '#353439'
typography:
  display-xl:
    fontFamily: Anybody
    fontSize: 80px
    fontWeight: '800'
    lineHeight: 88px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Anybody
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Anybody
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Anybody
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
---

## Brand & Style
This design system captures the electric atmosphere of live entertainment through a **High-Contrast / Glassmorphic** aesthetic. It targets a young, tech-savvy audience looking for premium access to music festivals, nightlife, and sporting events. The interface is characterized by deep immersive voids punctuated by neon light, simulating the experience of a dark stage illuminated by lasers. 

The visual narrative relies on transparency, glowing accents, and a sense of "speed" conveyed through wide typography and razor-sharp borders. Every interaction should feel instantaneous and high-fidelity.

## Colors
The palette is rooted in a deep charcoal-black background (`#0A0A0E`) to ensure maximum pop for the neon accents. 

- **Electric Blue (#00D1FF):** Used for primary actions, success states, and focus indicators.
- **Punchy Violet (#BC13FE):** Used for secondary highlights, "Premium" or "VIP" tiers, and gradient transitions.
- **Neon Lime (#CCFF00):** Used sparingly for urgent calls-to-action (CTAs), live status indicators, and price tags to ensure high visibility.
- **Surface & Glass:** Use semi-transparent whites for layered surfaces to create the frosted glass effect, paired with vibrant background blurs to prevent the UI from feeling flat.

## Typography
The typography strategy pairs high-impact display faces with clinical, technical secondary fonts. 

- **Headlines:** Use **Anybody** in its bold or expanded widths. The variable nature of this font allows for a "stretched" look that communicates energy and scale. Use uppercase for main event titles.
- **Body:** **Inter** provides high legibility for event descriptions and transactional data.
- **Data/Metadata:** **JetBrains Mono** is used for tickets, dates, barcodes, and seat numbers to provide a precise, "technical" feel consistent with high-speed ticketing.

## Layout & Spacing
The layout follows a **Fluid Grid** model with generous margins to allow the content to breathe against the dark background. 

- **Desktop:** 12-column grid with 24px gutters. Use wide 64px outer margins to create a premium, "gallery" feel.
- **Mobile:** 4-column grid with 16px gutters.
- **Rhythm:** Use an 8px base unit. Component padding should be generous (24px+ for cards) to maintain a luxurious sense of space.
- **Reflow:** For event listings, transition from a 3-column masonry grid on desktop to a single-column list on mobile.

## Elevation & Depth
Depth is achieved through **Glassmorphism** rather than traditional shadows. 

1.  **Base Layer:** Pure `#0A0A0E`.
2.  **Mid Layer (Cards):** 5% white opacity with a `20px` background blur and a `1px` solid border (`rgba(255,255,255,0.1)`). 
3.  **Top Layer (Sticky Nav/Modals):** 10% white opacity with a `40px` background blur.
4.  **Accents:** Use "Glows"—soft, radial gradients of the primary or secondary colors—positioned behind cards or in corners to create a neon-lit environment. Avoid drop shadows; use outer glows (box-shadow with color) only for active neon elements like buttons or live indicators.

## Shapes
The design system uses a **Rounded** (0.5rem) base to balance the aggressive typography with a modern, approachable feel. 

- **Buttons & Chips:** Use 0.5rem (8px) for standard elements.
- **Feature Cards:** Use `rounded-xl` (1.5rem) to create distinct visual containers.
- **Interactive Inputs:** Maintain the 8px radius for consistency across form fields.

## Components
- **Buttons:** 
  - *Primary:* Solid Neon Lime or Electric Blue with black text. On hover, apply a `20px` outer glow of the same color.
  - *Secondary:* Glass background with a white 1px border.
- **Cards:** 1px white border at 10% opacity. Include a "Hot" badge using a Neon Lime to Electric Blue gradient for trending events.
- **Input Fields:** Darker than the background or fully transparent with a 1px bottom border. Focus state should trigger a glow effect on the border.
- **Sticky Header:** High-blur glass effect (40px blur) to allow event imagery to bleed through as the user scrolls.
- **Chips:** Small, pill-shaped tags using **JetBrains Mono** for genre (e.g., "TECHNO", "VIP") with low-opacity color fills.
- **Ticket Stubs:** Use a "cut-out" mask effect on the sides of the card to mimic physical ticket perforation, paired with a monospaced barcode.