import { z } from "./../../deps.ts";
import {
  type ParameterLocation,
  type ParameterObject,
} from "../openapi/openapi30.ts";
import { schemaFromZodSchema } from "./schemaFromZodSchema.ts";

export const parameterObjectsFromSchema = (
  // deno-lint-ignore no-explicit-any
  s: z.ZodObject<any>,
  location: ParameterLocation,
): ParameterObject[] => {
  const { shape } = s;

  return Object.keys(shape).reduce<ParameterObject[]>((acc, key) => {
    return [
      ...acc,
      {
        in: location,
        name: key,
        description: shape[key].description ?? "No description available",
        schema: schemaFromZodSchema(shape[key]),
        required: location === "path"
          ? true
          : shape[key].isOptional() === false,
      },
    ];
  }, []);
};
