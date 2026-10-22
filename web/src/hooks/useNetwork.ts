import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Route, Stop, SafeSpot } from "@transitiq/shared";

export interface NetworkState {
  routes: Route[];
  stops: Stop[];
  safeSpots?: SafeSpot[];
  loading: boolean;
  error: Error | null;
}

export function useNetwork(): NetworkState {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [safeSpots, setSafeSpots] = useState<SafeSpot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadNetwork() {
      try {
        const [stopsSnap, routesSnap, safeSpotsSnap] = await Promise.all([
          getDocs(collection(db, "stops")),
          getDocs(collection(db, "routes")),
          getDocs(collection(db, "safeSpots")),
        ]);

        if (!isMounted) return;

        const loadedStops = stopsSnap.docs.map((d) => Stop.parse(d.data()));
        const loadedRoutes = routesSnap.docs.map((d) => Route.parse(d.data()));
        const loadedSpots = safeSpotsSnap.docs.map((d) => SafeSpot.parse(d.data()));

        setStops(loadedStops);
        setRoutes(loadedRoutes);
        setSafeSpots(loadedSpots);
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

  return { routes, stops, safeSpots, loading, error };
}
