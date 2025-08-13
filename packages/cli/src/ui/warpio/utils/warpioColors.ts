/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Warpio Brand Color System
 * Elegant color strategy based on the Warpio brand gradient
 */

// Warpio Brand Colors (from warpio theme)
export const WarpioColors = {
  // Primary brand gradient
  blue: '#0D83C9', // Vibrant sky-blue (primary)
  green: '#3CA84B', // Science green (secondary)
  orange: '#F47B20', // Warm orange (accent)

  // Semantic mappings
  primary: '#0D83C9', // For main elements, providers, links
  secondary: '#3CA84B', // For models, important data
  accent: '#F47B20', // For highlights, capabilities, percentages

  // State colors
  success: '#3CA84B', // Green for success states
  warning: '#F47B20', // Orange for warnings
  info: '#0D83C9', // Blue for information
} as const;

/**
 * Warpio Color Hierarchy System
 * Applies brand colors in a logical hierarchy for UI elements
 */
export class WarpioColorSystem {
  /**
   * Get color for primary elements (providers, main actions)
   */
  static primary(): string {
    return WarpioColors.primary;
  }

  /**
   * Get color for secondary elements (models, data)
   */
  static secondary(): string {
    return WarpioColors.secondary;
  }

  /**
   * Get color for accent elements (capabilities, stats, highlights)
   */
  static accent(): string {
    return WarpioColors.accent;
  }

  /**
   * Get provider-specific color following Warpio hierarchy
   * Cloud providers = blue, Local providers = green, Others = orange
   */
  static provider(providerName: string): string {
    const name = providerName.toLowerCase();

    // Cloud providers: Warpio blue
    if (
      name.includes('google') ||
      name.includes('gemini') ||
      name.includes('openai') ||
      name.includes('anthropic')
    ) {
      return WarpioColors.blue;
    }

    // Local providers: Warpio green
    if (
      name.includes('lmstudio') ||
      name.includes('ollama') ||
      name.includes('local')
    ) {
      return WarpioColors.green;
    }

    // Other providers: Warpio orange
    return WarpioColors.orange;
  }

  /**
   * Get color for model names (always secondary green)
   */
  static model(): string {
    return WarpioColors.secondary;
  }

  /**
   * Get color for capabilities and stats (always accent orange)
   */
  static capability(): string {
    return WarpioColors.accent;
  }

  /**
   * Get color for separators and delimiters (primary blue)
   */
  static separator(): string {
    return WarpioColors.primary;
  }

  /**
   * Get gradient array for special elements
   */
  static gradient(): string[] {
    return [WarpioColors.blue, WarpioColors.green, WarpioColors.orange];
  }

  /**
   * Get color for persona elements (green for active state)
   */
  static persona(): string {
    return WarpioColors.secondary;
  }

  /**
   * Get color for interactive elements (blue)
   */
  static interactive(): string {
    return WarpioColors.primary;
  }
}

export { WarpioColorSystem as default };
