import { oak, z } from "../deps.ts";
import { Endpoint, EndpointRouter } from "./EndpointRouter.ts";

import * as oa from "./openapi/openapi30.ts";
import { oakPathToOpenApiPath } from "./utils/index.ts";
import { parameterObjectsFromSchema } from "./utils/parameterObjectsFromSchema.ts";
import { schemaFromZodSchema } from "./utils/schemaFromZodSchema.ts";

export class ZOak {
  routers: EndpointRouter[] = [];
  oakApp = new oak.Application();
  constructor() {
  }
  get enpdoints() {
    return this.routers.reduce<Array<Endpoint>>(
      (eps, r) => [...eps, ...r.endpoints],
      [],
    );
  }
  async listen(port: number) {
    return await this.oakApp.listen({ port });
  }
  addRouter(router: EndpointRouter) {
    this.routers.push(router);
    this.oakApp.use(router.routes(), router.allowedMethods());
  }
  openapi3({ title, version }: { title: string; version: string }): string {
    const paths: Set<string> = new Set();
    const endpoints = this.enpdoints;
    for (const endpoint of endpoints) {
      paths.add(endpoint.path);
    }
    const document: oa.OpenAPIObject = {
      openapi: "3.0.3",
      info: {
        title,
        version,
      },
      paths: [...paths].reduce((acc, p) => {
        const pEndpoints = endpoints.filter((e) => e.path === p);
        return {
          ...acc,
          [oakPathToOpenApiPath(p)]: pEndpoints.reduce<oa.PathItemObject>(
            (eacc, ep) => {
              const responses: oa.ResponsesObject = ep.validators.responses
                ? Object.keys(ep.validators.responses).reduce(
                  (racc, status: string) => {
                    return {
                      ...racc,
                      [status]: {
                        content: {
                          "application/json": {
                            schema: schemaFromZodSchema(
                              ep.validators.responses?.[Number(status)],
                            ) ??
                              {},
                          },
                        },
                        description: ep.validators.responses?.[Number(status)]
                          .description ??
                          "No description available",
                      },
                    };
                  },
                  {},
                )
                : {};
              const requestBody: oa.RequestBodyObject | undefined =
                ep.validators.body
                  ? {
                    description: ep.validators.body?.description ??
                      "No description available",
                    content: {
                      "application/json": {
                        schema: schemaFromZodSchema(ep.validators.body),
                      },
                    },
                  }
                  : undefined;

              const pParams: oa.ParameterObject[] = ep.validators.params &&
                  ep.validators.params instanceof z.ZodObject
                ? parameterObjectsFromSchema(ep.validators.params, "path")
                : [];

              const qParams: oa.ParameterObject[] = ep.validators.query &&
                  ep.validators.query instanceof z.ZodObject
                ? parameterObjectsFromSchema(ep.validators.query, "query")
                : [];

              const parameters: oa.ParameterObject[] = [...pParams, ...qParams];

              const opObject: oa.OperationObject = {
                responses,
                requestBody,
                parameters,
              };
              return {
                ...eacc,
                [ep.method]: opObject,
              };
            },
            {},
          ),
        };
      }, {}),
    };
    return JSON.stringify(document);
  }
}
