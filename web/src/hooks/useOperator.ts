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
  signOutOperator: () => Promise<void>;
}

export function useOperator(): OperatorState {
  const [user, setUser] = useState<User | null>(null);
  const [isOperator, setIsOperator] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Force refresh the token to retrieve custom claims
          const tokenResult = await currentUser.getIdTokenResult(true);
          const hasClaim = tokenResult.claims.role === "operator";
          setIsOperator(Boolean(hasClaim));
        } catch (err) {
          console.warn("Failed to retrieve token claims:", err);
          setIsOperator(false);
        }
      } else {
        setIsOperator(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const tokenResult = await cred.user.getIdTokenResult(true);
      setIsOperator(tokenResult.claims.role === "operator");
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
      setIsOperator(tokenResult.claims.role === "operator");
    } catch (err) {
      console.error("Test operator sign-in error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOutOperator = async () => {
    setLoading(true);
    try {
      await signOut(auth);
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
    signOutOperator,
  };
}
