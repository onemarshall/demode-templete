import * as z from "zod";
import type { FormField } from "$lib/types/directus-schema";

// Create a dynamic Zod schema based on Directus form fields
export function createDynamicFormSchema(fields: FormField[]) {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  fields.forEach((field) => {
    if (!field.name) return;

    let fieldSchema: z.ZodTypeAny;

    // Create base schema based on field type
    switch (field.type) {
      case "checkbox":
        fieldSchema = z.boolean().default(false);
        break;

      case "checkbox_group":
        fieldSchema = z.array(z.string()).default([]);
        break;

      case "radio":
        fieldSchema = z.string();
        break;

      case "file":
        fieldSchema = z.instanceof(File).optional();
        break;

      case "textarea":
        fieldSchema = z.string();
        break;

      case "select":
        fieldSchema = z.string();
        break;

      default:
        fieldSchema = z.string();
        break;
    }

    // Apply validations if any
    if (field.validation) {
      const rules = field.validation.split("|");

      rules.forEach((rule) => {
        const [ruleName, ruleValue] = rule.split(":");
        const normalizedRule = ruleName.toLowerCase();

        // Only apply string validations to string fields
        if (fieldSchema instanceof z.ZodString) {
          switch (normalizedRule) {
            case "email":
              fieldSchema = fieldSchema.email({
                message: `${field.label || field.name} must be a valid email`,
              });
              break;

            case "url":
              fieldSchema = fieldSchema.url({
                message: `${field.label || field.name} must be a valid URL`,
              });
              break;

            case "min": {
              const min = parseInt(ruleValue, 10);
              if (!isNaN(min)) {
                fieldSchema = fieldSchema.min(min, {
                  message: `${field.label || field.name} must be at least ${min} characters`,
                });
              }
              break;
            }

            case "max": {
              const max = parseInt(ruleValue, 10);
              if (!isNaN(max)) {
                fieldSchema = fieldSchema.max(max, {
                  message: `${field.label || field.name} must be at most ${max} characters`,
                });
              }
              break;
            }

            case "length": {
              const length = parseInt(ruleValue, 10);
              if (!isNaN(length)) {
                fieldSchema = fieldSchema.length(length, {
                  message: `${field.label || field.name} must be exactly ${length} characters`,
                });
              }
              break;
            }

            default:
              console.warn(`Unknown validation rule: ${ruleName}`);
          }
        }
      });
    }

    // Handle required/optional fields
    if (field.required) {
      if (fieldSchema instanceof z.ZodString) {
        fieldSchema = fieldSchema.min(1, {
          message: `${field.label || field.name} is required`,
        });
      }
    } else if (fieldSchema instanceof z.ZodString) {
      // For optional string fields, allow empty string or undefined
      fieldSchema = fieldSchema.optional().or(z.literal(""));
    } else {
      // For other optional fields, just make them optional
      fieldSchema = fieldSchema.optional();
    }

    schemaFields[field.name] = fieldSchema;
  });

  return z.object(schemaFields);
}

export type DynamicFormSchema = ReturnType<typeof createDynamicFormSchema>;
