import { PARAM_TYPES } from "./constants";
import type { RouteParts } from "./types";

export const matchRoute = (url: string, routeParts: RouteParts) => {
  const pathname = url.split("?")[0] ?? "/";
  const items = pathname.split("/").filter((item) => item !== "");

  for (let index = 0; index < routeParts.length; index++) {
    const item = items[index];
    const part = routeParts[index];

    if (part == null) {
      return false;
    }

    if (typeof part === "string") {
      if (item === part) {
        continue;
      } else {
        return false;
      }
    }

    if (part.type === PARAM_TYPES.OPTIONAL_CATCH_ALL) {
      return true;
    }
    if (part.type === PARAM_TYPES.CATCH_ALL) {
      return item != null;
    }
    if (part.type === PARAM_TYPES.VARIABLE && item == null) {
      return false;
    }
  }

  return true;
};
