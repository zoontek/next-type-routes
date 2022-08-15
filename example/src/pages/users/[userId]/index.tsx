import { GetServerSideProps } from "next";
import Link from "next/link";
import {
  createURL,
  getServerSideParams,
  useRouterWithSSR,
} from "../../../router";

// This page is rendered on the server
export const getServerSideProps: GetServerSideProps = async (context) => {
  const params = getServerSideParams("/users/[userId]", context);

  // We can access params in a safe way on the server too!
  console.log(params.route.userId);

  return { props: {} };
};

export default function UserPage() {
  // We can use useRouterWithSSR since getServerSideProps is also used
  const { params } = useRouterWithSSR("/users/[userId]");
  const { userId } = params.route; // userId type is guaranteed to be string

  return (
    <>
      <h1>{userId}</h1>
      <p>{userId} homepage</p>

      <Link href={createURL("/users/[userId]/repositories", { userId })}>
        Repositories
      </Link>

      <Link
        href={createURL("/users/[userId]/favorites/[[...rest]]", { userId })}
      >
        Favorites
      </Link>
    </>
  );
}
