import Link from "next/link";
import { USERS_DATA } from "../../data";
import { createURL } from "../../routes";

export default function UsersPage() {
  return (
    <>
      <h1>Users page</h1>

      {Object.keys(USERS_DATA).map((userId) => (
        <Link key={userId} href={createURL("/users/[userId]", { userId })}>
          {userId}
        </Link>
      ))}
    </>
  );
}
