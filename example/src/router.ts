import { createTypedFns } from "next-typed-router";

export const {
  createURL,
  getApiRequestParams,
  getServerSideParams,
  useRouterWithSSR,
  useRouterWithNoSSR,
} = createTypedFns([
  "/",
  "/api/hello",
]);
