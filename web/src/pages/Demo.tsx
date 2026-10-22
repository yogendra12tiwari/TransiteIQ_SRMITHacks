import { useState, useEffect, useRef } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNetwork } from "../hooks/useNetwork";
import { useOperator } from "../hooks/useOperator";
import { initSim, stepSim, getSimLive, type SimState } from "@transitiq/shared";

const MAX_SESSION_SECONDS = 600; // 10 minutes auto-stop
const DAILY_WRITE_QUOTA = 20000; // 20k writes daily budget
const WARNING_THRESHOLD = 0.8 * DAILY_WRITE_QUOTA;

export function DemoPage() {
  const { user, isOperator, signOutOperator } = useOperator();
  const { routes, stops, loading: networkLoading } = useNetwork();

  const [isRunning, setIsRunning] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2 | 5>(1);
  const [scenario, setScenario] = useState<"live" | "replay">("live");
  const [hour, setHour] = useState<number>(20); // 8 PM evening default
  const [simState, setSimState] = useState<SimState | null>(null);

  const [secondsRemaining, setSecondsRemaining] = useState<number>(MAX_SESSION_SECONDS);
  const [sessionWrites, setSessionWrites] = useState<number>(0);
  const [totalWrites, setTotalWrites] = useState<number>(() => {
    const saved = localStorage.getItem("transitiq_write_counter");
    return saved ? parseInt(saved, 10) : 0;
  });

  const [isLeaderTab, setIsLeaderTab] = useState<boolean>(true);
  const [tabConflict, setTabConflict] = useState<boolean>(false);
  const [lastWrittenTime, setLastWrittenTime] = useState<string | null>(null);

  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>(Math.random().toString(36).substring(2, 9));

  // Single-tab guard (BroadcastChannel)
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;

    const channel = new BroadcastChannel("transitiq-sim-controller");
    channelRef.current = channel;

    channel.onmessage = (event) => {
      const data = event.data as { type: string; tabId: string };
      if (data.type === "PING_LEADER" && isLeaderTab) {
        channel.postMessage({ type: "LEADER_ALIVE", tabId: tabIdRef.current });
      } else if (data.type === "LEADER_ALIVE" && data.tabId !== tabIdRef.current) {
        setTabConflict(true);
        setIsLeaderTab(false);
        setIsRunning(false);
      }
    };

    channel.postMessage({ type: "PING_LEADER", tabId: tabIdRef.current });

    return () => {
      channel.close();
    };
  }, [isLeaderTab]);

  // Initialize sim when network is ready
  useEffect(() => {
    if (routes.length > 0 && stops.length > 0 && !simState) {
      const initial = initSim({ routes, stops }, hour, 42, scenario);
      setSimState(initial);
    }
  }, [routes, stops, hour, scenario, simState]);

  // When hour or scenario changes, re-init sim
  const handleHourChange = (newHour: number) => {
    setHour(newHour);
    if (routes.length > 0 && stops.length > 0) {
      const updated = initSim({ routes, stops }, newHour, Date.now(), scenario);
      setSimState(updated);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsRemaining(MAX_SESSION_SECONDS);
    if (routes.length > 0 && stops.length > 0) {
      const reset = initSim({ routes, stops }, hour, 42, scenario);
      setSimState(reset);
    }
  };

  // Main simulation loop (2-second tick)
  useEffect(() => {
    if (!isRunning || !isLeaderTab || !simState || routes.length === 0) return;

    const interval = setInterval(async () => {
      // Auto-stop countdown check
      setSecondsRemaining((prev) => {
        if (prev <= 2) {
          setIsRunning(false);
          return 0;
        }
        return prev - 2;
      });

      try {
        const dtSec = 2 * speedMultiplier;
        const nextState = stepSim(simState, dtSec, { routes, stops }, hour);
        setSimState(nextState);

        const liveSnapshot = getSimLive(nextState, hour);

        // Write to Firestore sim/live doc
        await setDoc(doc(db, "sim", "live"), liveSnapshot);

        setSessionWrites((w) => w + 1);
        setTotalWrites((t) => {
          const updated = t + 1;
          localStorage.setItem("transitiq_write_counter", updated.toString());
          return updated;
        });
        setLastWrittenTime(new Date().toLocaleTimeString());
      } catch (err) {
        console.error("Failed to step and write sim state:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isRunning, isLeaderTab, simState, routes, stops, hour, speedMultiplier]);

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (networkLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full mr-3" />
        Loading Lucknow transit network from Firestore...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Operator Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-lg">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-xl font-bold text-white">Simulation Controller</h1>
          </div>
          <p className="text-xs text-slate-400">
            Authenticated operator:{" "}
            <span className="text-slate-200 font-mono">{user?.email || "Simulator Operator"}</span>
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
            Role: Operator
          </span>
          {isOperator && (
            <button
              onClick={() => signOutOperator()}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
            >
              Sign out
            </button>
          )}
        </div>
      </div>

      {/* Conflict / Single-tab banner */}
      {tabConflict && (
        <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-300 text-sm flex items-center justify-between">
          <span>
            ⚠️ Another demo controller tab is active. Controller paused to prevent duplicate Firestore writes.
          </span>
          <button
            onClick={() => {
              setTabConflict(false);
              setIsLeaderTab(true);
            }}
            className="text-xs px-3 py-1 bg-amber-700 hover:bg-amber-600 text-white rounded font-medium"
          >
            Claim Leader
          </button>
        </div>
      )}

      {/* Write Counter & Safety Countdown Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Countdown */}
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Auto-Stop Timer</span>
            <span className="text-slate-500">10m Max</span>
          </div>
          <div
            data-testid="auto-stop-countdown"
            className={`text-2xl font-bold font-mono ${
              secondsRemaining < 60 ? "text-rose-400" : "text-emerald-400"
            }`}
          >
            {formatCountdown(secondsRemaining)}
          </div>
          <p className="text-xs text-slate-400">{isRunning ? "Sim active; writes each 2s tick" : "Paused"}</p>
        </div>

        {/* Writes this session */}
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
          <div className="text-xs text-slate-400">Session Writes</div>
          <div data-testid="session-write-counter" className="text-2xl font-bold font-mono text-white">
            {sessionWrites}
          </div>
          <p className="text-xs text-slate-400">
            {lastWrittenTime ? `Last write: ${lastWrittenTime}` : "No writes yet"}
          </p>
        </div>

        {/* Daily Quota Tracking */}
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Daily Budget Usage</span>
            <span className="font-mono">
              {totalWrites} / {DAILY_WRITE_QUOTA}
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden my-2">
            <div
              className={`h-2.5 rounded-full transition-all ${
                totalWrites >= WARNING_THRESHOLD ? "bg-rose-500" : "bg-indigo-500"
              }`}
              style={{ width: `${Math.min(100, (totalWrites / DAILY_WRITE_QUOTA) * 100)}%` }}
            />
          </div>
          {totalWrites >= WARNING_THRESHOLD && (
            <p className="text-xs text-rose-400 font-medium">⚠️ 80% daily quota reached</p>
          )}
        </div>
      </div>

      {/* Main Controls Card */}
      <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-lg space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/60 pb-6">
          {/* Start / Pause / Reset */}
          <div className="flex items-center space-x-3">
            <button
              data-testid="sim-toggle-btn"
              onClick={() => setIsRunning(!isRunning)}
              disabled={secondsRemaining <= 0 || tabConflict}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition shadow-lg ${
                isRunning
                  ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 disabled:opacity-50"
              }`}
            >
              {isRunning ? "⏸ Pause Simulator" : "▶ Start Simulator"}
            </button>

            <button
              data-testid="sim-reset-btn"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-sm transition"
            >
              ↺ Reset
            </button>
          </div>

          {/* Speed Multiplier */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Speed:</span>
            {([1, 2, 5] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSpeedMultiplier(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  speedMultiplier === m
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-slate-700/60 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {m}×
              </button>
            ))}
          </div>

          {/* Scenario Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Scenario:</span>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as "live" | "replay")}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="live">Live Traffic</option>
              <option value="replay">Incident Replay</option>
            </select>
          </div>
        </div>

        {/* Time Slider (5 PM to 10 PM) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300 font-medium">Time-of-Day Slider (5 PM – 10 PM)</span>
            <span className="font-mono text-indigo-400 font-bold">
              {hour}:00 IST ({hour >= 12 ? (hour === 12 ? "12 PM" : `${hour - 12} PM`) : `${hour} AM`})
            </span>
          </div>
          <input
            data-testid="time-slider"
            type="range"
            min={17}
            max={22}
            step={1}
            value={hour}
            onChange={(e) => handleHourChange(parseInt(e.target.value, 10))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>17:00 (Evening Peak)</span>
            <span>19:00 (Night Onset)</span>
            <span>22:00 (Late Evening)</span>
          </div>
        </div>
      </div>

      {/* Live Fleet Inspector */}
      <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">
            Active Simulated Fleet ({simState?.buses.length ?? 0} Buses)
          </h2>
          <span className="text-xs text-slate-400">Tick: {simState?.tick ?? 0}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase bg-slate-900/60 text-slate-400 border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Bus ID</th>
                <th className="py-2.5 px-3">Route</th>
                <th className="py-2.5 px-3">Position (m)</th>
                <th className="py-2.5 px-3">Speed</th>
                <th className="py-2.5 px-3">Coordinates</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 font-mono">
              {simState?.buses.map((bus) => (
                <tr key={bus.id} className="hover:bg-slate-700/30">
                  <td className="py-2 px-3 font-semibold text-white">{bus.id}</td>
                  <td className="py-2 px-3 text-indigo-300">{bus.routeId}</td>
                  <td className="py-2 px-3">{Math.round(bus.distanceAlongRouteM)} m</td>
                  <td className="py-2 px-3">
                    {bus.speedMps === 0 ? (
                      <span className="text-amber-400">0 m/s (Dwelling)</span>
                    ) : (
                      <span>
                        {bus.speedMps.toFixed(1)} m/s ({(bus.speedMps * 3.6).toFixed(0)} km/h)
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-slate-400">
                    {bus.lat.toFixed(4)}, {bus.lng.toFixed(4)}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-sans font-medium ${
                        bus.speedMps === 0
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {bus.speedMps === 0 ? "DWELLING" : bus.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
