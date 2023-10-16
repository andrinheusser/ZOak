import { oak, z } from "./../deps.ts";
import {
  EndpointValidator,
  ValidatorResponseSchema,
} from "./EndpointValidator.ts";
import { InputValidationError, ResponseValidationError } from "./Errors.ts";
import * as oa from "./openapi/openapi30.ts";

export type Endpoint = {
  path: string;
  method: "get" | "post" | "put" | "delete";
  validators: {
    query?: z.ZodTypeAny;
    body?: z.ZodTypeAny;
    params?: z.ZodTypeAny;
    responses?: ValidatorResponseSchema;
  };
};

export class EndpointRouter extends oak.Router {
  endpoints: Array<Endpoint> = [];

  constructor() {
    super();
  }

  endpoint<
    Path extends string,
    querySchema extends z.ZodTypeAny,
    bodySchema extends z.ZodTypeAny,
    paramSchema extends z.ZodTypeAny,
    responses extends ValidatorResponseSchema,
    S extends number,
  >(
    path: Path,
    method: "get" | "post" | "put" | "delete",
    validators: {
      query?: querySchema;
      body?: bodySchema;
      params?: paramSchema;
      responses?: responses;
    },
    handler: (
      inputs: ReturnType<
        EndpointValidator<
          Path,
          querySchema,
          bodySchema,
          paramSchema,
          responses
        >["validateInput"]
      >,
      ctx: oak.RouterContext<Path>,
    ) => Promise<
      [
        S extends keyof responses ? S : never,
        S extends keyof responses ? z.infer<responses[S]> : never,
      ]
    >,
  ): void {
    if (this.endpoints.find((e) => e.path === path && e.method === method)) {
      throw new Error(`Endpoint already exists for ${method} ${path}`);
    }
    this.endpoints.push({
      path,
      method,
      validators,
    });
    const validator = new EndpointValidator(validators);
    this[method](path, async (ctx) => {
      ctx.response.headers.set("Content-Type", "application/json");
      try {
        const input = validator.validateInput({
          query: oak.helpers.getQuery(ctx, { mergeParams: false }) ?? undefined,
          body: await ctx.request.body({ type: "json" }).value ?? undefined,
          params: ctx.params ?? undefined,
        });
        const result = await handler(input, ctx);
        ctx.response.headers.set("Content-Type", "application/json");
        ctx.response.body = JSON.stringify(
          validator.validateResponse(...result),
        );
      } catch (e) {
        if (e instanceof InputValidationError) {
          ctx.throw(400, e.message);
        }
        if (e instanceof ResponseValidationError) {
          if (ctx.response.status >= 200 && ctx.response.status < 300) {
            ctx.throw(500, e.message);
          }
        }
        throw e;
      }
    });
  }
}
