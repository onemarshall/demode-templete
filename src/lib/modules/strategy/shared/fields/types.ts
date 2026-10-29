/** Shared field-definition vocabulary for every strategy stage screen. One mechanism, declared once
 * per stage, rendered by `StageFieldEditor`. */

export type FieldKind =
  | "text"
  | "number"
  | "range"
  | "textarea"
  | "select"
  | "select-list"
  | "computed"
  | "boolean"
  | "nullable-boolean"
  | "list"
  | "object"
  | "object-list";

export interface Field {
  key: string;
  label: string;
  kind: FieldKind;
  help?: string;
  options?: readonly { value: string; label: string }[];
  fields?: readonly Field[];
  itemFields?: readonly Field[];
  /** Minimum number of items the schema allows — the editor enforces it. */
  minItems?: number;
  /** Maximum number of items the schema allows — the editor enforces it. */
  maxItems?: number;
  mirrorBoolean?: string;
  optional?: boolean;
  nullable?: boolean;
  readOnly?: boolean;
}

export interface StageDefinition {
  label: string;
  purpose: string;
  fields: readonly Field[];
}

/** Module-specific post-set behaviour. Receives the key, the incoming value and the object that is
 * about to be emitted, and may adjust it in place. */
export type FieldDerive = (key: string, value: unknown, next: Record<string, unknown>) => void;

/** Module-specific display for `computed` fields. */
export type FieldComputed = (key: string, current: unknown) => string | undefined;

const label = (value: string) => value.replaceAll("-", " ").replaceAll("_", " ");

export const text = (key: string, labelText: string, help?: string): Field => ({
  key,
  label: labelText,
  kind: "text",
  help,
});
export const area = (key: string, labelText: string, help?: string): Field => ({
  key,
  label: labelText,
  kind: "textarea",
  help,
});
export const list = (key: string, labelText: string, help?: string, limits: { minItems?: number; maxItems?: number } = {}): Field => ({
  key,
  label: labelText,
  kind: "list",
  help,
  ...limits,
});
export const select = (
  key: string,
  labelText: string,
  values: readonly string[],
  help?: string,
  options: { optional?: boolean; nullable?: boolean } = {},
): Field => ({
  key,
  label: labelText,
  kind: "select",
  help,
  options: values.map((value) => ({ value, label: label(value) })),
  ...options,
});
export const bool = (key: string, labelText: string, help?: string): Field => ({
  key,
  label: labelText,
  kind: "boolean",
  help,
});
export const nullableBool = (key: string, labelText: string, help?: string): Field => ({
  key,
  label: labelText,
  kind: "nullable-boolean",
  help,
});
export const object = (
  key: string,
  labelText: string,
  itemFields: readonly Field[],
  help?: string,
  options: { nullable?: boolean } = {},
): Field => ({
  key,
  label: labelText,
  kind: "object",
  itemFields,
  help,
  ...options,
});
export const objectList = (
  key: string,
  labelText: string,
  itemFields: readonly Field[],
  help?: string,
  limits: { minItems?: number; maxItems?: number } = {},
): Field => ({
  key,
  label: labelText,
  kind: "object-list",
  itemFields,
  help,
  ...limits,
});
