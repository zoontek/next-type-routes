import { getRoute } from "next-type-routes";

const route = getRoute<"/">();

export default function Home() {
  return <h1>Home</h1>;
}
