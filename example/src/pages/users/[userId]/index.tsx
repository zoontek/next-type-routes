import { GetServerSideProps } from "next";
import Link from "next/link";

// This page is rendered on the server
export const getServerSideProps: GetServerSideProps = async (context) => {
  const params = route.getServerSideParams(context);

  // We can access params in a safe way on the server too!
  console.log(params.userId);

  return { props: {} };
};

export default function UserPage() {
  const { routeParams } = route.useRouter();
  const { userId } = routeParams; // userId type is guaranteed to be string

  return (
    <>
      <h1>{userId}</h1>
      <p>{userId} homepage</p>

      <Link
        // href={createURL("/users/[userId]/repositories", { userId })}
        href="#"
      >
        Repositories
      </Link>

      <Link
        // href={createURL("/users/[userId]/favorites/[[...rest]]", { userId })}
        href="#"
      >
        Favorites
      </Link>
    </>
  );
}
