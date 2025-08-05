/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Warpio light theme – for bright terminals
 */
import { ColorsTheme, Theme } from './theme.js';

const BrandBlue = '#0D83C9';
const BrandOrange = '#F47B20';

const warpioLightColors: ColorsTheme = {
  type: 'light',
  Background: '#FFFFFF',
  Foreground: '#2E3440',
  LightBlue: BrandBlue,
  AccentBlue: BrandBlue,
  AccentPurple: BrandOrange, // orange reused
  AccentOrange: BrandOrange,
  AccentCyan: '#008B94',
  AccentGreen: '#047857',
  AccentYellow: '#B45309',
  AccentRed: '#B91C1C',
  DiffAdded: '#DCF6E6',
  DiffRemoved: '#FEE2E2',
  Comment: '#6B7280',
  Gray: '#9CA3AF',
  GradientColors: [BrandBlue, BrandOrange],
};

export const WarpioLight: Theme = new Theme(
  'Warpio Light',
  'light',
  {
    hljs: {
      display: 'block',
      overflowX: 'auto',
      padding: '0.5em',
      background: warpioLightColors.Background,
      color: warpioLightColors.Foreground,
    },
    'hljs-keyword': { color: warpioLightColors.AccentPurple },
    'hljs-literal': { color: warpioLightColors.AccentBlue },
    'hljs-symbol': { color: warpioLightColors.AccentCyan },
    'hljs-name': { color: warpioLightColors.LightBlue },
    'hljs-string': { color: warpioLightColors.AccentGreen },
    'hljs-comment': {
      color: warpioLightColors.Comment,
      fontStyle: 'italic',
    },
    'hljs-quote': { color: warpioLightColors.AccentCyan, fontStyle: 'italic' },
    'hljs-addition': { color: warpioLightColors.AccentGreen },
    'hljs-deletion': { color: warpioLightColors.AccentRed },
  },
  warpioLightColors,
);
