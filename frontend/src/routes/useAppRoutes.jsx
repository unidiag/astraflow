// src/routes/useAppRoutes.jsx
import React, { useMemo } from "react";
import { useRoutes } from "react-router-dom";
import { staticRoutes } from "./configRoutes";
import { NotFound404, MissingPage, withMenuTitle, RoutesFallback } from "./routeHelpers";

function makeLazyPage(componentBaseName, routeKey) {
  const LazyPage = React.lazy(() =>
    import(`../pages/${componentBaseName}Page.jsx`)
      .then((mod) => ({
        default: withMenuTitle(mod.default, routeKey),
      }))
      .catch(() => ({
        default: () => <MissingPage routeKey={routeKey} />,
      }))
  );

  return (
    <React.Suspense fallback={<RoutesFallback />}>
      <LazyPage />
    </React.Suspense>
  );
}

export default function useAppRoutes(urls) {
  const routesConfig = useMemo(() => {
    const dynamicRoutes = (urls || []).map((routeKey) => {
      const componentBaseName =
        routeKey.charAt(0).toUpperCase() + routeKey.slice(1);

      return {
        path: `/${routeKey}`,
        element: makeLazyPage(componentBaseName, routeKey),
      };
    });

    return [
      ...staticRoutes,
      ...dynamicRoutes,
      { path: "*", element: <NotFound404 /> },
    ];
  }, [urls]);

  return useRoutes(routesConfig);
}
