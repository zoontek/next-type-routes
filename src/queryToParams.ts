import type { ParsedUrlQuery } from "querystring";

export const queryToParams = (query: ParsedUrlQuery, paramNames: string[]) => {
  const routeParams: NodeJS.Dict<string | string[]> = {};
  const searchParams: ParsedUrlQuery = {};

  for (const key in query) {
    if (Object.prototype.hasOwnProperty.call(query, key)) {
      const value = query[key];

      if (value == null) {
        continue;
      }

      if (paramNames.includes(key)) {
        routeParams[key] = value;
      } else {
        searchParams[key] = value;
      }
    }
  }

  return {
    route: routeParams,
    search: searchParams,
  };
};
