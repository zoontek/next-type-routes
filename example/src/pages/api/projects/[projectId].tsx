import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // We can access params in a safe way on API routes too!
  const params = route.getRequestParams(req);
  res.status(200).json({ handler: "project", params });
}
