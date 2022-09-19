import type { NextApiRequest, NextApiResponse } from "next";
import { getRoute } from "next-type-routes";

const route = getRoute<"/api/auth/login">();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ handler: "login" });
}
