import type { GetServerSidePropsContext, NextApiRequest } from "next";
import { useRouter } from "next/router";
import type { Simplify } from "type-fest";
import { createURL } from "./createURL";
import { extractRoute } from "./extractRoute";
import { matchRoute } from "./matchRoute";
import { queryToParams } from "./queryToParams";
import type { GetRouteParams, Params, ParamsArgs, Router } from "./types";

const getError = (fn: string, input: string, route: string) =>
  new Error(`${fn} error: "${input}" does not match "${route}"`);

export const createTypedFns = <Route extends string>(routes: Route[]) => {
  type RouteParams = Simplify<{
    [K in Route]: GetRouteParams<K>;
  }>;
  type ApiRoute = keyof {
    [K in Route as K extends "/api" | `/api/${string}` ? K : never]: K;
  };
  type NonApiRoute = keyof {
    [K in Route as K extends "/api" | `/api/${string}` ? never : K]: K;
  };

  const extracted = {} as Record<Route, ReturnType<typeof extractRoute>>;

  for (const route of routes) {
    extracted[route] = extractRoute(route);
  }

  return {
    createURL: <T extends Route>(
      route: T,
      ...[routeParams, searchParams]: ParamsArgs<RouteParams[T]>
    ) => createURL(extracted[route].routeParts, routeParams, searchParams),

    getApiRequestParams: <T extends ApiRoute>(
      route: T,
      { query, url }: NextApiRequest,
    ) => {
      const resolvedUrl = url ?? "/";

      if (!matchRoute(resolvedUrl, extracted[route].routeParts)) {
        throw getError("getApiRequestParams", resolvedUrl, route);
      }

      return queryToParams(query, extracted[route].paramNames) as Params<
        RouteParams[T]
      >;
    },

    getServerSideParams: <T extends NonApiRoute>(
      route: T,
      { query, resolvedUrl }: GetServerSidePropsContext,
    ) => {
      if (!matchRoute(resolvedUrl, extracted[route].routeParts)) {
        throw getError("getServerSideParams", resolvedUrl, route);
      }

      return queryToParams(query, extracted[route].paramNames) as Params<
        RouteParams[T]
      >;
    },

    useRouterWithSSR: <T extends NonApiRoute>(route: T) => {
      const { query, ...router } = useRouter();

      if (route !== router.pathname) {
        throw getError("useRouterWithSSR", route, router.pathname);
      }

      return {
        ...router,
        params: queryToParams(query, extracted[route].paramNames),
      } as Router<RouteParams[T]>;
    },

    useRouterWithNoSSR: <T extends NonApiRoute>(route: T) => {
      const { query, ...router } = useRouter();

      if (route !== router.pathname) {
        throw getError("useRouterWithNoSSR", route, router.pathname);
      }

      return {
        ...router,
        params: queryToParams(query, extracted[route].paramNames),
      } as Router<Partial<RouteParams[T]>>;
    },
  };
};
