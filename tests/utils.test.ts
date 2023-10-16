import { assert } from "https://deno.land/std@0.200.0/assert/assert.ts";
import { describe, it } from "https://deno.land/std@0.204.0/testing/bdd.ts";
import { oakPathToOpenApiPath } from "../src/utils/index.ts";

describe("utils tests", () => {
  it("converts oak path to openapi path - simple", () => {
    const oak = "/hello/:name";
    const openapi = "/hello/{name}";

    assert(oakPathToOpenApiPath(oak) === openapi);
  });
  it("converts oak path to openapi path - advanced", () => {
    assert(oakPathToOpenApiPath("/a/:foo/b/:bar") === "/a/{foo}/b/{bar}");
  });
});
