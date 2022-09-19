import { GetServerSideProps } from "next";
import { getRoute } from "next-type-routes";

const route = getRoute<"/users/[userId]/repositories/[repositoryId]">();

// This page is rendered on the server
export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

export default function RepositoryPage() {
  const { routeParams } = route.useRouter();
  const { userId, repositoryId } = routeParams; // userid and repositoryId type is guaranteed to be string

  return (
    <>
      <h1>
        {userId}/{repositoryId}
      </h1>

      <code>
        <pre>{JSON.stringify(routeParams, null, 2)}</pre>
      </code>
    </>
  );
}
