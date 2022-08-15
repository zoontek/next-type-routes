import type { ParsedUrlQueryInput } from "querystring";

const appendSearchParam = (acc: string, key: string, value: string): string => {
  const output = acc + (acc !== "" ? "&" : "") + encodeURIComponent(key);
  return value !== "" ? output + "=" + encodeURIComponent(value) : output;
};

const stringifyPrimitive = (value: string | number | boolean) => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" && !isFinite(value)) {
    return "";
  }

  return String(value);
};

export const encodeSearchParams = (
  searchParams: ParsedUrlQueryInput,
): string => {
  const keys = Object.keys(searchParams);

  if (keys.length === 0) {
    return "";
  }

  let output = "";
  keys.sort(); // keys are sorted in place

  for (const key of keys) {
    const value = searchParams[key];

    if (value == null) {
      continue;
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      output = appendSearchParam(output, key, stringifyPrimitive(value));
    } else {
      for (const item of value) {
        output = appendSearchParam(output, key, stringifyPrimitive(item));
      }
    }
  }

  if (output === "") {
    return ""; // searchParams have only empty arrays
  }

  return "?" + output;
};
