import { GetServerSidePropsContext, NextApiRequest } from "next";

export type ApiRoutesParams = Record<string, never>;
export type PageRoutesParams = Record<string, never>;

export type ApiRoute = keyof ApiRoutesParams;
export type PageRoute = keyof PageRoutesParams;
export type Route = ApiRoute | PageRoute;
export type RoutesParams = PageRoutesParams & ApiRoutesParams;

export const getRoute = <T extends Route>(): T extends ApiRoute
  ? {
      getRequestParams: (request: NextApiRequest) => ApiRoutesParams[T];
    }
  : {
      useRouter: () => { routeParams: PageRoutesParams[T] };
      getServerSideParams: (
        context: GetServerSidePropsContext,
      ) => PageRoutesParams[T];
    } => {};
