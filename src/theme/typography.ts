// src/theme/typography.ts

/**
 * Centralized font tokens for the app.
 * Change fonts here → app updates everywhere.
 */

export const Fonts = {
  /** Large titles (names, screen headers) */
  title: "Lexend",

  /** Section headers / subheaders */
  sub: "Crimson-Regular",

  /** Emphasized subheaders */
  subBold: "Crimson-Bold",

  /** Normal paragraph text */
  body: "Crimson-Regular",

  /** Technical / detail / metadata text */
  mono: "DMMono-Regular",
} as const;

export type FontKey = keyof typeof Fonts;