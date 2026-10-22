import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Route, Stop } from "@transitiq/shared";

export interface NetworkState {
  routes: Route[];
  stops: Stop[];
  loading: boolean;
  error: Error | null;
}

export function useNetwork(): NetworkState {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadNetwork() {
      try {
        const [stopsSnap, routesSnap] = await Promise.all([
          getDocs(collection(db, "stops")),
          getDocs(collection(db, "routes")),
        ]);

        if (!isMounted) return;

        const loadedStops = stopsSnap.docs.map((d) => Stop.parse(d.data()));
        const loadedRoutes = routesSnap.docs.map((d) => Route.parse(d.data()));

        setStops(loadedStops);
        setRoutes(loadedRoutes);
        setError(null);
      } catch (err: unknown) {
        if (!isMounted) return;
        console.warn("Error loading network from Firestore:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadNetwork();

    return () => {
      isMounted = false;
    };
  }, []);

  return { routes, stops, loading, error };
}
