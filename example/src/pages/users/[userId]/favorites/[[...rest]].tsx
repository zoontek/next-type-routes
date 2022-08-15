import { useRouterWithSSR } from "../../../../router";

export default function FavoritesArea() {
  const { params } = useRouterWithSSR("/users/[userId]/favorites/[[...rest]]");
  const { userId, rest } = params.route; // userId is string, rest is string[] | undefined

  return (
    <>
      <h1>Favorites area</h1>

      <code>
        <pre>{JSON.stringify(params.route, null, 2)}</pre>
      </code>
    </>
  );
}
