export type ApiRoutesParams = Record<string, never>;
export type PageRoutesParams = Record<string, never>;

export type RoutesParams = PageRoutesParams & ApiRoutesParams;
export type ApiRoute = keyof ApiRoutesParams;
export type PageRoute = keyof PageRoutesParams;
export type Route = ApiRoute | PageRoute;
