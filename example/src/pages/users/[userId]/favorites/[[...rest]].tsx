import { getRoute } from "next-type-routes";

// TODO: Check why this getRoute is not generated
const route = getRoute<"/users/[userId]/favorites/[[...rest]]">();

export default function FavoritesArea() {
  const { routeParams } = route.useRouter();
  const { userId, rest } = routeParams; // userId is string, rest is string[] | undefined

  return (
    <>
      <h1>Favorites area</h1>

      <code>
        <pre>{JSON.stringify(routeParams, null, 2)}</pre>
      </code>
    </>
  );
}
