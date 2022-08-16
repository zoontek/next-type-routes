# 🔬 next-type-routes

[![mit licence](https://img.shields.io/dub/l/vibe-d.svg?style=for-the-badge)](https://github.com/zoontek/next-type-routes/blob/main/LICENSE)
[![npm version](https://img.shields.io/npm/v/next-type-routes?style=for-the-badge)](https://www.npmjs.org/package/next-type-routes)
[![bundlephobia](https://img.shields.io/bundlephobia/minzip/next-type-routes?label=size&style=for-the-badge)](https://bundlephobia.com/result?p=next-type-routes)

An experiment to make next.js routes usage safer.<br>
**Heavily inspired by my work on [@swan-io/chicane](https://github.com/swan-io/chicane)**

_⚠️ Don't use this in production (yet)!_

## Installation

```bash
$ yarn add next-type-routes
# --- or ---
$ npm install --save next-type-routes
```

## Quickstart

First, you have to generate the typed routes functions. For that, I recommend using npm scripts:

```json
"scripts": {
  "type-routes": "type-routes src/routes.ts",
  "dev": "yarn type-routes && next dev",
  "build": "yarn type-routes && next build",
```

When ran, this command parse your pages tree and generates a TS file (`src/routes.ts`) which looks like this:

```ts
import { createTypedFns } from "next-type-routes";

export const {
  createURL,
  getApiRequestParams,
  getServerSideParams,
  useRouterWithSSR,
  useRouterWithNoSSR,
} = createTypedFns([
  // Here will be all your project routes:
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
```

## API

### createURL

```tsx
import Link from "next/link";
import { createURL } from "path/to/routes";

export default function ExamplePage() {
  return (
    <>
      <h1>Users</h1>

      {/* URL params are type safe! */}
      <Link href={createURL("/users/[userId]", { userId: "zoontek" })}>
        zoontek
      </Link>
    </>
  );
}
```

### useRouterWithSSR

```tsx
import { useRouterWithSSR } from "path/to/routes";

export default function ExamplePage() {
  const { params } = useRouterWithSSR("/users/[userId]"); // we can use useRouterWithSSR since getServerSideProps is used
  const { userId } = params.route; // userId type is string

  return <h1>{userId} profile</h1>;
}
```

### useRouterWithNoSSR

```tsx
import { useRouterWithNoSSR } from "path/to/routes";

export default function ExamplePage() {
  const { params } = useRouterWithNoSSR("/users/[userId]"); // we have to use useRouterWithNoSSR since getServerSideProps is not used
  const { userId } = params.route; // userId type is string | undefined

  if (userId == null) {
    return <span>Loading…</span>;
  }

  return <h1>{userId} profile</h1>;
}
```

### getApiRequestParams

```ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getApiRequestParams } from "path/to/routes";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // we can access params in a safe way on API routes
  const params = getApiRequestParams("/api/projects/[projectId]", req);

  res.status(200).json({ handler: "project", params });
}
```

### getServerSideParams

```ts
import { GetServerSideProps } from "next";
import Link from "next/link";
import { getServerSideParams } from "path/to/routes";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const params = getServerSideParams("/users/[userId]", context);

  // we can access params in a safe way on the server
  console.log(params.route.userId);

  return { props: {} };
};
```

## Error handling

What happen when I, let's say, use `useRouterWithSSR("/users/[userId]")` in page with `/project/[projectId]` path?<br>
Well, it will throw an error 💥. That's why I **highly** recommend to create a [`500.tsx` page](https://nextjs.org/docs/advanced-features/custom-error-page#500-page) and wrap your app in an [Error Boundary](https://reactjs.org/docs/error-boundaries.html).

![](https://github.com/zoontek/next-type-routes/blob/main/docs/screenshot.png?raw=true)
