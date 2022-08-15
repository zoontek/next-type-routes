import { PARAM_TYPES } from "./constants";
import type { RouteParts } from "./types";

export const extractRoute = (route: string) => {
  const paramNames: string[] = [];
  const routeParts: RouteParts = [];

  for (const item of route.split("/").filter((item) => item !== "")) {
    if (item.startsWith("[[...") && item.endsWith("]]")) {
      const name = item.slice(5, -2);
      paramNames.push(name);
      routeParts.push({ name, type: PARAM_TYPES.OPTIONAL_CATCH_ALL });
      continue;
    }

    if (item.startsWith("[...") && item.endsWith("]")) {
      const name = item.slice(4, -1);
      paramNames.push(name);
      routeParts.push({ name, type: PARAM_TYPES.CATCH_ALL });
      continue;
    }

    if (item.startsWith("[") && item.endsWith("]")) {
      const name = item.slice(1, -1);
      paramNames.push(name);
      routeParts.push({ name, type: PARAM_TYPES.VARIABLE });
      continue;
    }

    routeParts.push(item);
  }

  return {
    paramNames,
    routeParts,
  };
};
