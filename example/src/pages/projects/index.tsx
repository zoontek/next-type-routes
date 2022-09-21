import Link from "next/link";
import { PROJECTS_DATA } from "../../data";

export default function ProjectsPage() {
  return (
    <>
      <h1>Projects page</h1>

      {PROJECTS_DATA.map((projectId) => (
        <Link
          key={projectId}
          href="#"
          // href={createURL("/projects/[projectId]", { projectId })}
        >
          {projectId}
        </Link>
      ))}
    </>
  );
}
