import { GetServerSideProps } from "next";
import { useRouterWithSSR } from "../../../../routes";

// This page is rendered on the server
export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

export default function RepositoryPage() {
  // We can use useRouterWithSSR since getServerSideProps is also used
  const { params } = useRouterWithSSR(
    "/users/[userId]/repositories/[repositoryId]",
  );

  const { userId, repositoryId } = params.route; // userid and repositoryId type is guaranteed to be string

  return (
    <>
      <h1>
        {userId}/{repositoryId}
      </h1>

      <code>
        <pre>{JSON.stringify(params.route, null, 2)}</pre>
      </code>
    </>
  );
}
