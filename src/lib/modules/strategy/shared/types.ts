/** Browser-safe identities and route vocabulary. FolderName exists for legacy records/adapters only. */
import { z } from "zod";

export const SessionId = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "Session must be a UUID",
  );

export const FolderName = z
  .string()
  .regex(/^[A-Za-z0-9._-]+$/)
  .refine((value) => value !== "." && value !== "..", "Folder must be a single client folder name");

export const RouteKind = z.enum(["skip", "light", "constrained", "full"]);

export type RouteKind = z.infer<typeof RouteKind>;
