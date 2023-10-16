import { z } from "./../../deps.ts";
import * as oa from "../openapi/openapi30.ts";
import { oaTypeFromZodType } from "./index.ts";

export const schemaFromZodSchema = (
  s: z.ZodTypeAny | undefined,
  { optional, nullable } = { optional: false, nullable: false },
): oa.SchemaObject => {
  if (!s) {
    return {};
  }
  if (s instanceof z.ZodDefault) {
    return schemaFromZodSchema(s._def.innerType, { optional, nullable });
  }
  if (s instanceof z.ZodOptional) {
    return schemaFromZodSchema(s._def.innerType, { optional: true, nullable });
  }
  if (s instanceof z.ZodNullable) {
    return schemaFromZodSchema(s._def.innerType, { optional, nullable: true });
  }
  if (s instanceof z.ZodObject) {
    const shape = s.shape;
    const properties = Object.keys(shape).reduce((acc, key) => {
      return {
        ...acc,
        [key]: schemaFromZodSchema(shape[key]),
      };
    }, {});
    return {
      type: oaTypeFromZodType[s._def.typeName],
      properties,
      required: Object.keys(shape).filter((key) =>
        shape[key].isOptional() === false
      ),
    };
  }
  if (s instanceof z.ZodArray) {
    return {
      type: oaTypeFromZodType[s._def.typeName],
      items: schemaFromZodSchema(s._def.type),
      maxItems: s._def.maxLength?.value ?? undefined,
      minItems: s._def.minLength?.value ?? undefined,
      nullable: s.isNullable(),
    };
  }
  if (s instanceof z.ZodString) {
    return {
      type: oaTypeFromZodType[s._def.typeName],
      minLength: s.minLength ?? undefined,
      maxLength: s.maxLength ?? undefined,
      nullable: s.isNullable() || nullable,
      "default": s.default ?? undefined,
    };
  }
  if (s instanceof z.ZodNumber) {
    return {
      type: oaTypeFromZodType[s._def.typeName],
      minimum: s.minValue ?? undefined,
      maxLength: s.maxValue ?? undefined,
      nullable: s.isNullable() || nullable,
    };
  }
  return { type: oaTypeFromZodType[s._def.typeName] };
};
