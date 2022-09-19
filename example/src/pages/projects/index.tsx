import Link from "next/link";
import { PROJECTS_DATA } from "../../data";
import { createURL } from "../../routes";
import { getRoute } from "next-type-routes";

const route = getRoute<"/projects">();

export default function ProjectsPage() {
  return (
    <>
      <h1>Projects page</h1>

      {PROJECTS_DATA.map((projectId) => (
        <Link
          key={projectId}
          href={createURL("/projects/[projectId]", { projectId })}
        >
          {projectId}
        </Link>
      ))}
    </>
  );
}
