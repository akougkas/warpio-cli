/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { PersonaManager } from '@google/gemini-cli-core/src/personas/persona-manager.js';

describe('Warpio Personas E2E', () => {
  describe('Persona Manager Functionality', () => {
    it('should have PersonaManager available', () => {
      expect(PersonaManager).toBeDefined();
      expect(typeof PersonaManager.loadPersona).toBe('function');
    });

    it('should handle persona loading without throwing errors', () => {
      expect(() => PersonaManager.loadPersona('warpio')).not.toThrow();
      expect(() => PersonaManager.loadPersona('data-expert')).not.toThrow();
      expect(() => PersonaManager.loadPersona('analysis-expert')).not.toThrow();
      expect(() => PersonaManager.loadPersona('hpc-expert')).not.toThrow();
      expect(() => PersonaManager.loadPersona('research-expert')).not.toThrow();
      expect(() => PersonaManager.loadPersona('workflow-expert')).not.toThrow();
    });

    it('should handle unknown persona gracefully', () => {
      expect(() => PersonaManager.loadPersona('unknown-persona')).not.toThrow();
      const result = PersonaManager.loadPersona('unknown-persona');
      expect(result).toBeNull();
    });

    it('should handle empty or invalid input gracefully', () => {
      expect(() => PersonaManager.loadPersona('')).not.toThrow();
      expect(() => PersonaManager.loadPersona('   ')).not.toThrow();
      
      const emptyResult = PersonaManager.loadPersona('');
      const whitespaceResult = PersonaManager.loadPersona('   ');
      
      expect(emptyResult).toBeNull();
      expect(whitespaceResult).toBeNull();
    });

    it('should return consistent results for same persona', () => {
      const persona1 = PersonaManager.loadPersona('warpio');
      const persona2 = PersonaManager.loadPersona('warpio');
      
      // Should return the same structure (testing consistency)
      expect(persona1).toEqual(persona2);
    });

    it('should return objects with expected structure when personas exist', () => {
      const persona = PersonaManager.loadPersona('warpio');
      
      if (persona !== null) {
        expect(persona).toHaveProperty('name');
        expect(typeof persona.name).toBe('string');
      }
    });
  });
});