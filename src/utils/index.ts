import { type SchemaObjectType } from "../openapi/openapi30.ts";
export const oaTypeFromZodType: Record<string, SchemaObjectType> = {
  ZodString: "string",
  ZodTuple: "array",
  ZodEnum: "array",
  ZodNumber: "number",
  ZodObject: "object",
};
export const oakPathToOpenApiPath = (p: string) => {
  return p.replace(/:(\w+)/g, "{$1}");
};
