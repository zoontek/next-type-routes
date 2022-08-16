import { useRouterWithNoSSR } from "../../routes";

export default function ProjectPage() {
  const { params } = useRouterWithNoSSR("/projects/[projectId]");
  const { projectId } = params.route; // projectId is string | undefined as no SSR is used

  if (projectId == null) {
    return <span>Loading…</span>;
  }

  return (
    <>
      <h1>{projectId} project</h1>

      <code>
        <pre>{JSON.stringify(params.route, null, 2)}</pre>
      </code>
    </>
  );
}
