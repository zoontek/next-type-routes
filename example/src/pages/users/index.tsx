import Link from "next/link";
import { USERS_DATA } from "../../data";

export default function UsersPage() {
  return (
    <>
      <h1>Users page</h1>

      {Object.keys(USERS_DATA).map((userId) => (
        <Link
          key={userId}
          // href={createURL("/users/[userId]", { userId })}
          href="#"
        >
          {userId}
        </Link>
      ))}
    </>
  );
}
