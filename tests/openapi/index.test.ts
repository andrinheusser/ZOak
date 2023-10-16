import {
  beforeAll,
  describe,
  it,
} from "https://deno.land/std@0.204.0/testing/bdd.ts";
import { z } from "../../deps.ts";
import { EndpointRouter, ZOak } from "../../mod.ts";
import { assert } from "https://deno.land/std@0.200.0/assert/assert.ts";
import testSchema from "./testSchema.json" assert { type: "json" };
import { equal } from "https://deno.land/x/equal@v1.5.0/mod.ts";

describe("ZOak", () => {
  let api: ZOak;
  let router: EndpointRouter;
  const title = "Test API";
  const version = "1.0.0";

  beforeAll(() => {
    api = new ZOak();
    router = new EndpointRouter();

    router.endpoint(
      "/",
      "get",
      {
        responses: {
          200: z.string(),
        },
      },
      async () => {
        return await Promise.resolve([200, "healthy"]);
      },
    );

    router.endpoint(
      "/hello/:name",
      "get",
      {
        params: z.object({
          name: z.string().max(10),
        }),
        responses: {
          200: z.object({
            hello: z.string(),
          }),
        },
      },
      async (inputs) => {
        return await Promise.resolve([200, { hello: inputs.params.name }]);
      },
    );

    router.endpoint(
      "/authors",
      "post",
      {
        body: z.object({
          name: z.string().max(10),
          age: z.number().min(18).max(99),
          favoriteColor: z.string().optional(),
        }),
        responses: {
          201: z.object({
            id: z.string(),
            name: z.string(),
            age: z.number(),
            favoriteColor: z.string().optional(),
          }),
        },
      },
      async (inputs) => {
        return await Promise.resolve([201, { id: "123", ...inputs.body }]);
      },
    );

    router.endpoint(
      "/authors/search",
      "get",
      {
        query: z.object({
          name: z.string().max(10),
          age: z.coerce.number().min(18).max(99).optional(),
        }),
        responses: {
          200: z.array(z.object({
            name: z.string(),
            age: z.number(),
          })),
        },
      },
      async () => {
        return await Promise.resolve([200, [{ name: "John", age: 21 }]]);
      },
    );

    api.addRouter(router);
  });
  it("generates a valid json string", () => {
    const document = api.openapi3({ title, version });
    const parsed = JSON.parse(document);
    assert(typeof parsed === "object");
  });

  it("generates a valid OpenAPI document", () => {
    const document = api.openapi3({ title, version });
    assert(equal(JSON.parse(document), testSchema));
  });
});
