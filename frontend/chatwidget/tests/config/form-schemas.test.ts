import { describe, it, expect } from 'vitest';
import {
  PRECHAT_SCHEMA,
  OFFLINE_SCHEMA,
  POSTCHAT_SCHEMA,
  TICKET_SCHEMA,
} from '../../config/form-schemas.js';

describe('tokens/form-schemas.ts', () => {
  it('should define valid PRECHAT_SCHEMA', () => {
    expect(PRECHAT_SCHEMA.id).toBe('prechat');
    expect(PRECHAT_SCHEMA.fields.length).toBeGreaterThan(0);
  });

  it('should define valid OFFLINE_SCHEMA', () => {
    expect(OFFLINE_SCHEMA.id).toBe('offline');
    expect(OFFLINE_SCHEMA.fields.length).toBeGreaterThan(0);
  });

  it('should define valid POSTCHAT_SCHEMA', () => {
    expect(POSTCHAT_SCHEMA.id).toBe('postchat');
    expect(POSTCHAT_SCHEMA.fields.length).toBeGreaterThan(0);
  });

  it('should define valid TICKET_SCHEMA', () => {
    expect(TICKET_SCHEMA.id).toBe('ticket');
    expect(TICKET_SCHEMA.fields.length).toBeGreaterThan(0);
  });
});
