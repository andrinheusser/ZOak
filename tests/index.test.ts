import {
  beforeAll,
  beforeEach,
  describe,
  it,
} from "https://deno.land/std@0.204.0/testing/bdd.ts";
import { z } from "../deps.ts";
import { EndpointRouter, ZOak } from "../mod.ts";
import { SuperDeno, superoak } from "https://deno.land/x/superoak@4.7.0/mod.ts";
import { isHttpError } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { assertThrows } from "https://deno.land/std@0.129.0/testing/asserts.ts";

describe("ZOak Request Tests", () => {
  let api: ZOak;
  let router: EndpointRouter;
  let request: SuperDeno;

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
            favoriteColor: z.string().nullable(),
          }),
        },
      },
      async (inputs) => {
        return await Promise.resolve([201, {
          id: "123",
          favoriteColor: null,
          ...inputs.body,
        }]);
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

    api.oakApp.use(async (context, next) => {
      try {
        await next();
      } catch (err) {
        if (isHttpError(err)) {
          context.response.status = err.status;
        } else {
          context.response.status = 500;
        }
        context.response.body = { error: err.message };
        context.response.type = "json";
      }
    });

    api.addRouter(router);
  });

  beforeEach(async () => {
    request = await superoak(api.oakApp);
  });

  it("health check", async () => {
    await request.get("/").expect('"healthy"');
  });
  it("returns method not allowed for unimplemented method", async () => {
    await request.post("/").expect(405);
  });
  it("returns valid params", async () => {
    await request.get("/hello/world").expect({ hello: "world" });
  });
  it("returns invalid request on invalid params", async () => {
    await request.get("/hello/stringlongerthantencharacters").expect(400);
  });
  it("returns invalid request on passing query if no query is expected", async () => {
    await request
      .post("/authors?firstname=John&lastname=Doe&age=21")
      .expect(400);
  });
  it("valid body and response - omit optional favoriteColor", async () => {
    await request
      .post("/authors")
      .send({ name: "John", age: 21 })
      .expect({ id: "123", name: "John", age: 21, favoriteColor: null });
  });
  it("valid body and response", async () => {
    await request
      .post("/authors")
      .send({ name: "John", age: 21, favoriteColor: "blue" })
      .expect({ id: "123", name: "John", age: 21, favoriteColor: "blue" });
  });
  it("validation for body but no body sent", async () => {
    await request
      .post("/authors")
      .expect(400);
  });
  it("invalid body - age too low", async () => {
    await request
      .post("/authors")
      .send({ name: "John", age: 1 })
      .expect(400);
  });
  it("invalid body - age property missing", async () => {
    await request
      .post("/authors")
      .send({ name: "John" })
      .expect(400);
  });
  it("valid query and response", async () => {
    await request
      .get("/authors/search?name=John&age=21")
      .expect([{ name: "John", age: 21 }]);
  });
  it("omit query when query required", async () => {
    await request
      .get("/authors/search")
      .expect(400);
  });
  it("valid query, but includes extra data", async () => {
    await request
      .get("/authors/search?name=John&age=21&foo=bar")
      .expect([{ name: "John", age: 21 }]);
  });
  it("invalid query - age too low", async () => {
    await request
      .get("/authors/search?name=John&age=3")
      .expect(400);
  });
  it("invalid query - missing name", async () => {
    await request
      .get("/authors/search?age=21")
      .expect(400);
  });
  it("valid query - missing optional age", async () => {
    await request
      .get("/authors/search?name=John")
      .expect([{ name: "John", age: 21 }]);
  });
});

describe("ZOak EndpointRouter Tests", () => {
  it("throws on already registered endpoint", () => {
    const myRouter = new EndpointRouter();
    myRouter.endpoint(
      "/authors",
      "post",
      {
        body: z.object({
          name: z.string().max(10),
          age: z.number().min(18).max(99),
        }),
        responses: {
          201: z.object({
            id: z.string(),
            name: z.string(),
            age: z.number(),
          }),
        },
      },
      async (inputs) => {
        return await Promise.resolve([201, { id: "123", ...inputs.body }]);
      },
    );

    assertThrows(() =>
      myRouter.endpoint(
        "/authors",
        "post",
        {
          body: z.object({
            name: z.string().max(10),
            age: z.number().min(18).max(99),
          }),
          responses: {
            201: z.object({
              id: z.string(),
              name: z.string(),
              age: z.number(),
            }),
          },
        },
        async (inputs) => {
          return await Promise.resolve([201, { id: "123", ...inputs.body }]);
        },
      )
    );
  });
});
