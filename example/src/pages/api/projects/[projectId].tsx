import type { NextApiRequest, NextApiResponse } from "next";
import { getApiRequestParams } from "../../../router";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // We can access params in a safe way on API routes too!
  const params = getApiRequestParams("/api/projects/[projectId]", req);

  res.status(200).json({ handler: "project", params });
}
