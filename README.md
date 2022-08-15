# next-type-router

🔬 An experiment to make next.js router usage safer.

**Heavily inspired by my work on [@swan-io/chicane](https://github.com/swan-io/chicane)**

## Installation

```bash
$ yarn add next-type-router
# --- or ---
$ npm install --save next-type-router
```

## Quickstart

First, you have to generate the typed router functions. For that, I recommend using npm scripts:

```json
"scripts": {
  "type-router": "type-router src/router.ts",
  "dev": "yarn type-router && next dev",
  "build": "yarn type-router && next build",
```

When ran, this command parse your pages tree and generates a TS file (`src/router.ts`) which looks like this:

```ts
import { createTypedFns } from "next-type-router";

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
import { createURL } from "path/to/router";

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
import { useRouterWithSSR } from "path/to/router";

export default function ExamplePage() {
  const { params } = useRouterWithSSR("/users/[userId]"); // we can use useRouterWithSSR since getServerSideProps is used
  const { userId } = params.route; // userId type is string

  return <h1>{userId} profile</h1>;
}
```

### useRouterWithNoSSR

```tsx
import { useRouterWithNoSSR } from "path/to/router";

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
import { getApiRequestParams } from "path/to/router";

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
import { getServerSideParams } from "path/to/router";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const params = getServerSideParams("/users/[userId]", context);

  // we can access params in a safe way on the server
  console.log(params.route.userId);

  return { props: {} };
};
```

## Error handling

What happen when I, let's say, use `useRouterWithSSR("/users/[userId]")` in page with `/project/[projectId]` path?<br>
Well, it will throw an error 💥. That's why I **highly** recommand to create a [`500.tsx` page](https://nextjs.org/docs/advanced-features/custom-error-page#500-page) and wrap your app in an [Error Boundary](https://reactjs.org/docs/error-boundaries.html).

![](https://github.com/zoontek/next-type-router/blob/main/docs/screenshot.png?raw=true)
