import React from "react";
import { useOperator } from "../hooks/useOperator";

interface RequireOperatorProps {
  children: React.ReactNode;
}

export function RequireOperator({ children }: RequireOperatorProps) {
  const { user, isOperator, loading, signInWithGoogle, signOutOperator } = useOperator();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-slate-400">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4" />
        <p>Verifying operator credentials...</p>
      </div>
    );
  }

  if (!isOperator) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-slate-800/80 border border-slate-700 shadow-xl text-center space-y-4">
        <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center mx-auto text-2xl font-bold">
          🔒
        </div>
        <h2 className="text-xl font-bold text-white">Operator Access Required</h2>
        <p className="text-sm text-slate-300">
          The Simulation Controller & Fleet Management dashboard is restricted to authorized transit
          operators.
        </p>

        {user ? (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-800/40">
              Signed in as <span className="font-mono">{user.email}</span> (Missing operator claim)
            </p>
            <button
              onClick={() => signOutOperator()}
              className="w-full py-2 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm font-medium transition"
            >
              Sign out / switch account
            </button>
          </div>
        ) : (
          <button
            onClick={() => signInWithGoogle()}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2"
          >
            <span>Sign in with Google</span>
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
