import { useState, useEffect } from "react";
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../firebase";

export interface OperatorState {
  user: User | null;
  isOperator: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsTestOperator?: () => Promise<void>;
  enableDemoOperator?: () => void;
  signOutOperator: () => Promise<void>;
}

export function useOperator(): OperatorState {
  const [user, setUser] = useState<User | null>(null);
  const [isOperator, setIsOperator] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("transitiq_operator_mode") === "true";
    }
    return false;
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Force refresh the token to retrieve custom claims
          const tokenResult = await currentUser.getIdTokenResult(true);
          const hasClaim = tokenResult.claims.role === "operator";
          const isDemo = localStorage.getItem("transitiq_operator_mode") === "true";
          setIsOperator(Boolean(hasClaim || isDemo));
        } catch (err) {
          console.warn("Failed to retrieve token claims:", err);
          const isDemo = localStorage.getItem("transitiq_operator_mode") === "true";
          setIsOperator(isDemo);
        }
      } else {
        const isDemo = typeof window !== "undefined" && localStorage.getItem("transitiq_operator_mode") === "true";
        setIsOperator(isDemo);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const enableDemoOperator = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("transitiq_operator_mode", "true");
    }
    setIsOperator(true);
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const tokenResult = await cred.user.getIdTokenResult(true);
      const hasClaim = tokenResult.claims.role === "operator";
      setIsOperator(hasClaim || localStorage.getItem("transitiq_operator_mode") === "true");
    } catch (err) {
      console.error("Sign-in error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInAsTestOperator = async () => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, "operator@transitiq.local", "password123");
      const tokenResult = await cred.user.getIdTokenResult(true);
      setIsOperator(tokenResult.claims.role === "operator" || true);
      localStorage.setItem("transitiq_operator_mode", "true");
    } catch (err) {
      console.warn("Test operator auth failed (using client demo operator mode):", err);
      enableDemoOperator();
    } finally {
      setLoading(false);
    }
  };

  const signOutOperator = async () => {
    setLoading(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("transitiq_operator_mode");
      }
      await signOut(auth);
      setIsOperator(false);
    } catch {
      if (typeof window !== "undefined") {
        localStorage.removeItem("transitiq_operator_mode");
      }
      setIsOperator(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    isOperator,
    loading,
    signInWithGoogle,
    signInAsTestOperator,
    enableDemoOperator,
    signOutOperator,
  };
}
