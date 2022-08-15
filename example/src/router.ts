import { createTypedFns } from "next-typed-router";

export const {
  createURL,
  getApiRequestParams,
  getServerSideParams,
  useRouterWithSSR,
  useRouterWithNoSSR,
} = createTypedFns([
  "/",
  "/api/auth/login",
  "/api/projects/[projectId]",
  "/projects",
  "/projects/[projectId]",
  "/users",
  "/users/[userId]",
  "/users/[userId]/favorites/[[...rest]]",
  "/users/[userId]/repositories",
  "/users/[userId]/repositories/[repositoryId]",
]);
