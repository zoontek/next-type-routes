import type { ParsedUrlQueryInput } from "querystring";
import { encodeSearchParams } from "./searchParams";
import type { RouteParts } from "./types";

export const createURL = (
  routeParts: RouteParts,
  routeParams: NodeJS.Dict<string | string[]> = {},
  searchParams?: ParsedUrlQueryInput,
) => {
  let path = "";

  for (const part of routeParts) {
    if (typeof part === "string") {
      path += "/" + part;
      continue;
    }

    const param = routeParams[part.name];

    if (param == null) {
      continue;
    }

    const encoded =
      typeof param === "string"
        ? encodeURIComponent(param)
        : param.map(encodeURIComponent).join("/");

    path += "/" + encoded;
  }

  return (
    (path !== "" ? path : "/") +
    (searchParams != null ? encodeSearchParams(searchParams) : "")
  );
};
