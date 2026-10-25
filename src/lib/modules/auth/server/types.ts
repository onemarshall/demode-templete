/**
 * Server-specific Types
 *
 * Type definitions specific to server-side auth operations.
 */

import type { Auth } from './config';

// Re-export Auth type for convenience
export type { Auth } from './config';

export type User = Auth['$Infer']['Session']['user'];
export type Session = Auth['$Infer']['Session']['session'];
