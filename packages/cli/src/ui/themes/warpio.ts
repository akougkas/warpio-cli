/**
 * Warpio Dark Theme – brand colours (Blue ➜ Green ➜ Orange)
 * Inspired by IOWarp logo: neural-circuit motif with science-green accents.
 */
import { ColorsTheme, Theme } from './theme.js';

// Brand palette extracted from logo
const BrandBlue = '#0D83C9';   // vibrant sky-blue traces
const BrandGreen = '#3CA84B';  // muted science green
const BrandOrange = '#F47B20'; // warm energy orange

// Core colour map for Ink components & syntax highlighter
const warpioDarkColors: ColorsTheme = {
  type: 'dark',
  Background: '#0B0E14',          // deep navy background
  Foreground: '#CDD6F4',          // soft light grey text
  LightBlue: BrandBlue,
  AccentBlue: BrandBlue,          // function / type names
  AccentPurple: BrandOrange,      // mapped for legacy usage → orange
  AccentOrange: BrandOrange,
  AccentCyan: '#2dd4bf',          // teal links / literals
  AccentGreen: BrandGreen,
  AccentYellow: '#F9E2AF',
  AccentRed: '#F38BA8',
  DiffAdded: '#243b2e',           // dark green background
  DiffRemoved: '#3f1f1f',         // dark red background
  Comment: '#6C7086',
  Gray: '#6C7086',
  GradientColors: [BrandBlue, BrandGreen, BrandOrange],
};

export const Warpio: Theme = new Theme(
  'Warpio',
  'dark',
  {
    hljs: {
      display: 'block',
      overflowX: 'auto',
      padding: '0.5em',
      background: warpioDarkColors.Background,
      color: warpioDarkColors.Foreground,
    },
    // Syntax mappings
    'hljs-keyword': { color: BrandOrange },          // orange keywords
    'hljs-literal': { color: BrandGreen },           // green constants
    'hljs-symbol': { color: BrandBlue },             // blue symbols
    'hljs-name': { color: BrandBlue },
    'hljs-string': { color: BrandGreen },
    'hljs-title': { color: BrandOrange },
    'hljs-type': { color: BrandBlue },
    'hljs-attribute': { color: BrandOrange },
    'hljs-bullet': { color: BrandOrange },
    'hljs-addition': { color: BrandGreen },
    'hljs-deletion': { color: warpioDarkColors.AccentRed },
    'hljs-comment': { color: warpioDarkColors.Comment, fontStyle: 'italic' },
    'hljs-quote': { color: warpioDarkColors.AccentCyan, fontStyle: 'italic' },
  },
  warpioDarkColors,
);

