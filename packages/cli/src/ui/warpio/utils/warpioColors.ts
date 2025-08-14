/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Simplified Warpio Brand Color System
 * Core brand colors with essential semantic mappings
 */

// Warpio Brand Colors - Blue → Green → Orange gradient
export const WarpioColors = {
  blue: '#0D83C9',    // Primary (providers, links)
  green: '#3CA84B',   // Secondary (models, data) 
  orange: '#F47B20',  // Accent (capabilities, highlights)
} as const;

/**
 * Simple color utilities for consistent Warpio branding
 */
export class WarpioColorSystem {
  // Primary brand colors
  static primary() { return WarpioColors.blue; }
  static secondary() { return WarpioColors.green; }
  static accent() { return WarpioColors.orange; }

  // Semantic shortcuts
  static provider(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('lmstudio') || lower.includes('ollama')) return WarpioColors.green;
    if (lower.includes('gemini') || lower.includes('openai')) return WarpioColors.blue;
    return WarpioColors.orange;
  }
  
  // Compatibility methods for existing components
  static persona() { return WarpioColors.green; }
  static interactive() { return WarpioColors.blue; }
  static gradient() { return [WarpioColors.blue, WarpioColors.green, WarpioColors.orange]; }
  static separator() { return WarpioColors.blue; }
  static model() { return WarpioColors.green; }
  static capability() { return WarpioColors.orange; }
}
