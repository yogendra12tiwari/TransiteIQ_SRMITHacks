import { useState, useEffect, useRef } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useNetwork } from "../hooks/useNetwork";
import { useOperator } from "../hooks/useOperator";
import {
  initSim,
  stepSim,
  getSimLive,
  applySimOverrides,
  type SimState,
  type SimOverrides,
  IncidentRunner,
  DEFAULT_INCIDENT_SCHEDULE,
  generateReplayTape,
  ReplayController,
  type ReplayTape,
  type Alert,
} from "@transitiq/shared";

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

  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [replaySec, setReplaySec] = useState<number>(0);
  const overridesRef = useRef<SimOverrides>({});

  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>(Math.random().toString(36).substring(2, 9));
  const elapsedSecRef = useRef<number>(0);
  const incidentRunnerRef = useRef<IncidentRunner>(new IncidentRunner(DEFAULT_INCIDENT_SCHEDULE));
  const replayTapeRef = useRef<ReplayTape | null>(null);
  const replayControllerRef = useRef<ReplayController | null>(null);

  // Subscribe to sim/overrides (Decision D9: presenter merges driver overrides on every tick)
  useEffect(() => {
    if (scenario !== "live") return;
    try {
      const unsub = onSnapshot(doc(db, "sim", "overrides"), (snap) => {
        if (snap.exists()) {
          overridesRef.current = snap.data() as SimOverrides;
        }
      });
      return () => unsub();
    } catch {
      // offline fallback
    }
  }, [scenario]);

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
    elapsedSecRef.current = 0;
    incidentRunnerRef.current = new IncidentRunner(DEFAULT_INCIDENT_SCHEDULE);
    setActiveAlerts([]);
    setReplaySec(0);

    if (routes.length > 0 && stops.length > 0) {
      const reset = initSim({ routes, stops }, hour, 42, scenario);
      setSimState(reset);
    }
  };

  // Shortcut for demo evaluators to trigger incident sequence immediately (M3-35)
  const jumpToIncidents = () => {
    elapsedSecRef.current = 118; // 2 seconds before Bus 23 stall
    setIsRunning(true);
  };

  // Replay Mode initialization & tape generation (M3-24, M3-25)
  useEffect(() => {
    if (scenario === "replay" && routes.length > 0 && stops.length > 0) {
      setIsRunning(false);
      const tape = generateReplayTape({ routes, stops }, hour, 600, 2, 20261023, DEFAULT_INCIDENT_SCHEDULE);
      replayTapeRef.current = tape;
      replayControllerRef.current = new ReplayController(tape);
      const initialFrame = tape.frames[0];
      if (initialFrame) {
        setSimState((prev) =>
          prev
            ? {
                ...prev,
                buses: initialFrame.buses,
                tick: initialFrame.tick,
                simTimeMs: initialFrame.simTimeMs,
              }
            : null,
        );
        setActiveAlerts(initialFrame.alerts);
      }
    }
  }, [scenario, routes, stops, hour]);

  const handleReplaySeek = (newSec: number) => {
    setReplaySec(newSec);
    if (replayControllerRef.current) {
      const frame = replayControllerRef.current.seek(newSec);
      setSimState((prev) =>
        prev
          ? {
              ...prev,
              buses: frame.buses,
              tick: frame.tick,
              simTimeMs: frame.simTimeMs,
            }
          : null,
      );
      setActiveAlerts(frame.alerts);
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
        elapsedSecRef.current += dtSec;

        const nextState = stepSim(simState, dtSec, { routes, stops }, hour);

        // Apply scripted incidents (t=120s stall, t=125s skip, t=180s ghost) (M3-23, M3-35)
        const { state: incidentState, alerts } = incidentRunnerRef.current.apply(
          nextState,
          elapsedSecRef.current,
          { routes, stops },
          Date.now(),
        );

        setSimState(incidentState);
        setActiveAlerts(alerts);

        // Apply operator overrides from sim/overrides before publishing sim/live (D9)
        const stateWithOverrides = applySimOverrides(incidentState, overridesRef.current);
        const liveSnapshot = getSimLive(stateWithOverrides, hour, { routes, stops }, undefined, alerts);

        // Write to Firestore sim/live doc ONLY in live scenario (M3-24, M3-26: zero writes in replay mode)
        if (scenario === "live") {
          await setDoc(doc(db, "sim", "live"), liveSnapshot);

          setSessionWrites((w) => w + 1);
          setTotalWrites((t) => {
            const updated = t + 1;
            localStorage.setItem("transitiq_write_counter", updated.toString());
            return updated;
          });
          setLastWrittenTime(new Date().toLocaleTimeString());
        }
      } catch (err) {
        console.error("Failed to step and write sim state:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isRunning, isLeaderTab, simState, routes, stops, hour, speedMultiplier, scenario]);

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

            <button
              onClick={jumpToIncidents}
              title="Fast forward to t=118s to immediately trigger Bus 23 stall and Stop A likely-skip alerts"
              className="px-3.5 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 text-xs font-semibold transition flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>Trigger Incidents (t=118s)</span>
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

      {/* Interactive Replay Scrubber Card (M3-24, M3-25, M3-36: Zero Writes Guarantee) */}
      {scenario === "replay" && (
        <div className="p-6 rounded-2xl bg-purple-950/40 border border-purple-500/40 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
              <h2 className="text-base font-bold text-white">Client-Side Replay Timeline</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono font-bold">
                0 Firestore Writes
              </span>
            </div>
            <span className="font-mono text-sm text-purple-300 font-bold">
              {formatCountdown(replaySec)} / 10:00
            </span>
          </div>

          <div className="space-y-1">
            <input
              type="range"
              min={0}
              max={600}
              step={2}
              value={replaySec}
              onChange={(e) => handleReplaySeek(parseInt(e.target.value, 10))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>0:00 (Start)</span>
              <span className="text-amber-400">2:00 (Bus 23 Stall)</span>
              <span className="text-rose-400">2:05 (Stop A Skip)</span>
              <span className="text-indigo-400">3:00 (Route 12 Ghost)</span>
              <span>10:00 (End)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300">
            <button
              onClick={() => handleReplaySeek(118)}
              className="px-2.5 py-1 rounded-md bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-600/50"
            >
              Seek to Stall (1:58)
            </button>
            <button
              onClick={() => handleReplaySeek(125)}
              className="px-2.5 py-1 rounded-md bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-600/50"
            >
              Seek to Skip (2:05)
            </button>
            <button
              onClick={() => handleReplaySeek(180)}
              className="px-2.5 py-1 rounded-md bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-600/50"
            >
              Seek to Ghost (3:00)
            </button>
          </div>
        </div>
      )}

      {/* Active Alerts Monitor */}
      {activeAlerts.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-800/80 border border-amber-500/40 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">⚠️</span>
              <h2 className="text-sm font-bold text-white">
                Active Disruption Alerts ({activeAlerts.length})
              </h2>
            </div>
            <span className="text-xs text-amber-300">Live in sim/live</span>
          </div>

          <div className="space-y-2">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700 text-xs flex items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      {alert.type}
                    </span>
                    <span>{alert.message}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Stops affected: {alert.affectedStopIds.join(", ")}
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400">{alert.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
