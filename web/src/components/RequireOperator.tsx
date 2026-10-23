import React from "react";
import { useOperator } from "../hooks/useOperator";

interface RequireOperatorProps {
  children: React.ReactNode;
}

export function RequireOperator({ children }: RequireOperatorProps) {
  const {
    user,
    isOperator,
    loading,
    signInWithGoogle,
    signInAsTestOperator,
    enableDemoOperator,
    signOutOperator,
  } = useOperator();

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
          The Simulation Controller, Driver Panel, &amp; Authority Dashboard are restricted to authorized transit operators.
        </p>

        {user ? (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-800/40">
              Signed in as <span className="font-mono">{user.email}</span> (Missing operator claim)
            </p>
            <button
              type="button"
              onClick={() => enableDemoOperator?.()}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Enter Demo Operator Mode (Instant Access)</span>
            </button>
            <button
              type="button"
              onClick={() => signInAsTestOperator?.()}
              className="w-full py-2 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm font-medium transition text-white cursor-pointer"
            >
              Sign in as Local Test Operator
            </button>
            <button
              type="button"
              onClick={() => signOutOperator()}
              className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium transition text-slate-300 cursor-pointer"
            >
              Sign out / switch account
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={() => enableDemoOperator?.()}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Enter Demo Operator Mode (Instant Access)</span>
            </button>
            <button
              type="button"
              onClick={() => signInAsTestOperator?.()}
              className="w-full py-2 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-sm transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Sign in as Test Operator Account</span>
            </button>
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              className="w-full py-2 px-4 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium text-sm transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Sign in with Google</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
