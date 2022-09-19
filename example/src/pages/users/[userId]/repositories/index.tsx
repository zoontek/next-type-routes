import { GetServerSideProps } from "next";
import Link from "next/link";
import { USERS_DATA } from "../../../../data";
import { createURL } from "../../../../routes";
import { getRoute } from "next-type-routes";

const route = getRoute<"/users/[userId]/repositories">();

// This page is rendered on the server
export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

export default function RepositoriesPage() {
  const { routeParams } = route.useRouter();
  const { userId } = routeParams; // userId type is guaranteed to be string

  return (
    <>
      <h1>{userId} repositories</h1>

      <ul>
        {USERS_DATA[userId]?.map((repositoryId) => (
          <li key={repositoryId}>
            <Link
              href={createURL("/users/[userId]/repositories/[repositoryId]", {
                userId,
                repositoryId,
              })}
            >
              {repositoryId}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
