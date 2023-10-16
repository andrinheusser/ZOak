import { oak, z } from "./../deps.ts";
import { InputValidationError, ResponseValidationError } from "./Errors.ts";

export type ValidatorResponseSchema = { [StatusCode: number]: z.ZodTypeAny };

export class EndpointValidator<
  Path extends string,
  QuerySchema extends z.ZodTypeAny,
  BodySchema extends z.ZodTypeAny,
  ParamSchema extends z.ZodTypeAny,
  Responses extends ValidatorResponseSchema,
> {
  constructor(
    public readonly schemas: {
      query?: QuerySchema;
      body?: BodySchema;
      params?: ParamSchema;
      responses?: Responses;
    },
  ) {
  }
  parse<S extends z.ZodTypeAny>(
    data: unknown,
    schema: S | undefined,
    kind: "body" | "params" | "query",
  ): z.infer<S> {
    if (!schema) {
      throw new InputValidationError(
        `Passed data for ${kind} but no schema was provided`,
      );
    }
    return schema.parse(data);
  }
  validateInput<Q extends unknown, B extends unknown, P extends unknown>(
    { query, body, params }: {
      query?: Q;
      body?: B;
      params?: P;
    },
  ): {
    query: Q extends undefined ? undefined : z.infer<QuerySchema>;
    body: B extends undefined ? undefined : z.infer<BodySchema>;
    params: P extends undefined ? undefined : z.infer<ParamSchema>;
  } {
    try {
      return {
        query: query && Object.keys(query).length > 0
          ? this.parse(query, this.schemas.query, "query")
          : undefined,
        body: body ? this.parse(body, this.schemas.body, "body") : undefined,
        params: params && Object.keys(params).length > 0
          ? this.parse(params, this.schemas.params, "params")
          : undefined,
      };
    } catch (e) {
      if (e instanceof z.ZodError) {
        throw new InputValidationError(
          JSON.stringify(e.format(), undefined, 2),
        );
      }
      throw e;
    }
  }
  validateResponse<
    StatusCode extends keyof Responses,
    Body = Responses[StatusCode] extends z.ZodTypeAny
      ? z.infer<Responses[StatusCode]>
      : never,
  >(
    statusCode: StatusCode,
    body: Responses[StatusCode] extends z.ZodTypeAny
      ? z.infer<Responses[StatusCode]>
      : never,
  ): Body {
    if (!this.schemas.responses) {
      throw new Error(
        `No responses were provided for but a response was received`,
      );
    }
    const response = this.schemas.responses[statusCode] as z.ZodTypeAny;
    if (!response) {
      throw new Error(
        `No response was provided for status code ${String(statusCode)}`,
      );
    }
    try {
      return response.parse(body);
    } catch (e) {
      if (e instanceof z.ZodError) {
        throw new ResponseValidationError(
          JSON.stringify(e.format(), undefined, 2),
        );
      }
      throw e;
    }
  }
}
