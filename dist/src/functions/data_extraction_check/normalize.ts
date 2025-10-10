import { NormalizedItem } from '@devrev/ts-adaas';

/**
 * Normalizes a user object to the format expected by DevRev.
 * 
 * @param user The raw user object from the external system
 * @returns A normalized user object
 */
export function normalizeUser(user: any): NormalizedItem {
  return {
    id: user.id,
    created_date: user.created_at,
    modified_date: user.updated_at,
    data: {
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}