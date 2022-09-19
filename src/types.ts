import type { NextRouter } from "next/router";
import type { ParsedUrlQuery, ParsedUrlQueryInput } from "querystring";
import type { Except, Split, ValueOf } from "type-fest";
import { PARAM_TYPES } from "./constants";

export type NonEmptyArray<T> = [T, ...T[]];

export type GetRouteParams<
  Route extends string,
  Items = Split<Route, "/">,
> = Items extends [infer Head, ...infer Tail]
  ? Head extends `[[...${infer Name}]]`
    ? { [K in Name]?: string[] | undefined } & GetRouteParams<Route, Tail>
    : Head extends `[...${infer Name}]`
    ? { [K in Name]: NonEmptyArray<string> } & GetRouteParams<Route, Tail>
    : Head extends `[${infer Name}]`
    ? { [K in Name]: string } & GetRouteParams<Route, Tail>
    : GetRouteParams<Route, Tail>
  : {};

export type RouteParamPart = {
  name: string;
  type: ValueOf<typeof PARAM_TYPES>;
};

export type RouteParts = (string | RouteParamPart)[];

type EmptyRecord = Record<string | number | symbol, never>;

export type ParamsArgs<T> = T extends EmptyRecord
  ? [routeParams?: EmptyRecord, searchParams?: ParsedUrlQueryInput]
  : [routeParams: T, searchParams?: ParsedUrlQueryInput];

export type Params<T> = {
  route: T;
  search: ParsedUrlQuery;
};

export type Router<T> = Except<NextRouter, "query"> & {
  params: Params<T>;
};
