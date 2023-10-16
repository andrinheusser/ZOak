# ZOak

A Deno Library: Zod + Oak + Openapi3.0

- Validate Inputs
  - Query
  - Path parameters
  - Body
- Validate Responses
- Write handler functions with typed in- and output
- Generate openapi specs from your code

## Usage

```typescript
// Create a new app
api = new ZOak();
// Oak app available: api.oakApp

// Create a router to group endpoints
// extends Oak Router
router = new EndpointRouter();

// define endpoints, see examples below
router.endpoint(...);
router.endpoint(...);

// register router(s)
api.addRouter(router);

// start server
await api.listen(8080)
```

## Examples

### Basic with path parameter

```typescript
router.endpoint(
  "/hello/:name",
  // Method
  "get",
  {
    // Define inputs
    params: z.object({
      name: z.string(),
    }),
    /* Define query
    query: z.object({
        foo: z.string(),
        bar: z.coerce.number()
    })
    */
    // Define responses
    responses: {
      200: z.object({
        hello: z.string(),
      }),
    },
  },
  // Handler receives inputs based on schema(s) defined
  // and Oak's ctx as a second parameter
  async (inputs, ctx) => {
    // Return response as tuple
    return [200, { hello: inputs.params.name }];
  },
);
```

### Advanced with complex validation

```typescript
router.endpoint(
  "/authors",
  "post",
  {
    body: z.object({
      // Use zod for advanced runtime validation
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
  async (inputs, ctx) => {
    // await yourAsyncOperation(inputs.body)
    return [201, { id: "123", favoriteColor: null, ...inputs.body }];
  },
);
```

## Generate OpenApi 3 Json

```typescript
// generate a json document
const document: string = api.openapi3({ title: "My Api", version: "1.0.0" });
```

The generated Document is does not specify reference objects, but does a good
job of quickly providing an overview of your api including inputs and responses.

## Error Handling

If input validation (query, path params or body) fails, `400 Invalid Request` is
returned.

If response validation fails, `500 Internal Server Error` is returned

By default, details about the failed validation are returned in the response
body.

You may use a custom middleware to control this behaviour, eg:

```typescript
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
```

## Tests

```bash
deno test --allow-net
```
