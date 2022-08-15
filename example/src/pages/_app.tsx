import type { AppProps } from "next/app";
import Link from "next/link";
import "../main.css";
import { createURL } from "../router";

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
        <Link href={createURL("/")}>Home</Link>
        <Link href={createURL("/users")}>Users</Link>
        <Link href={createURL("/projects")}>Projects</Link>
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
