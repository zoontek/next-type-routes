export default function ProjectPage() {
  const { routeParams } = route.useRouter();
  const { projectId } = routeParams;

  if (projectId == null) {
    return <span>Loading…</span>;
  }

  return (
    <>
      <h1>{projectId} project</h1>

      <code>
        <pre>{JSON.stringify(routeParams, null, 2)}</pre>
      </code>
    </>
  );
}
