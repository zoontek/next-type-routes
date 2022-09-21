import "../main.css";

import type { AppProps } from "next/app";
import Link from "next/link";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
      }}
    >
      <nav
        style={{
          display: "flex",
          padding: 40,
          flexDirection: "column",
          width: 200,
        }}
      >
        <Link
          // href={createURL("/")}
          href="#"
        >
          Home
        </Link>

        <Link
          // href={createURL("/users")}
          href="#"
        >
          Users
        </Link>

        <Link
          // href={createURL("/projects")}
          href="#"
        >
          Projects
        </Link>
      </nav>

      <main
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          padding: 20,
        }}
      >
        <Component {...pageProps} />
      </main>
    </div>
  );
}
