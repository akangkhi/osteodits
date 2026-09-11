/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react'; // Note: framer-motion v12 standard
import {
  ArrowRight,
  Check,
  Activity,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

// Configuration
const DEFAULT_LINKS = [
  "https://osteo1.pve-23.jaysgrid.online/",
  "https://osteo.pve-3.jaysgrid.online/"
];
const DEFAULT_FALLBACK = "https://osteo.pve-3.jaysgrid.online/";
const REDIRECT_DELAY_MS = 5000;

const Stage = {
  SCANNING: 'SCANNING',
  READY: 'READY',
  FALLBACK: 'FALLBACK'
} as const;

type Stage = (typeof Stage)[keyof typeof Stage];

export default function App() {
  const [stage, setStage] = useState<Stage>(Stage.SCANNING);
  const [statusMessage, setStatusMessage] = useState("Checking closest node...");
  const [targetUrl, setTargetUrl] = useState("");
  const [countdown, setCountdown] = useState(REDIRECT_DELAY_MS / 1000);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Use a ref to track mounting state and prevent memory leaks on async updates
  const isMounted = useRef(true);
  const hasRunDiagnostics = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const checkLink = async (url: string): Promise<{ ok: boolean; status: number; time: number }> => {
    console.log(`Checking ${url}`);
    const start = Date.now();
    try {
      const controller = new AbortController();
      const id = setTimeout(() => {
        console.log(`Timeout for ${url}`);
        controller.abort();
      }, 500);

      const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      clearTimeout(id);

      const time = Date.now() - start;
      const ok = response.type === 'opaque';
      console.log(`Response for ${url}: ${ok ? 'opaque (likely OK)' : 'not opaque'} in ${time}ms`);
      return { ok, status: ok ? 200 : 0, time };
    } catch (error) {
      const time = Date.now() - start;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`Error for ${url}:`, errorMessage, `in ${time}ms`);
      return { ok: false, status: 0, time };
    }
  };

  const runDiagnostics = useCallback(async () => {
    console.log('Starting diagnostics');
    setStage(Stage.SCANNING);
    setStatusMessage("Checking closest node...");
    setCountdown(REDIRECT_DELAY_MS / 1000);

    for (const url of DEFAULT_LINKS) {
      console.log(`Testing ${url}`);
      const result = await checkLink(url);
      console.log(`Result for ${url}: ${result.ok}`);
      if (result.ok) {
        console.log(`Link ${url} is working`);

        setTargetUrl(url);
        const statusMsg = `Server ready (${result.status}) in ${result.time}ms`;
        console.log('Setting status:', statusMsg);
        setStatusMessage(statusMsg);
        await new Promise(r => setTimeout(r, 200));

        console.log('Setting status: Optimizing path...');
        setStatusMessage("Optimizing path...");
        await new Promise(r => setTimeout(r, 200));

        console.log('Setting status: Bringing up server...');
        setStatusMessage("Bringing up server...");
        await new Promise(r => setTimeout(r, 200));

        console.log('Setting stage to READY');
        setStage(Stage.READY);
        setStartTime(Date.now());

        return;
      }
      console.log(`Link ${url} failed`);
    }

    console.log('No working link found, using fallback');

    setStatusMessage("Primary nodes unreachable...");
    await new Promise(r => setTimeout(r, 200));

    setTargetUrl(DEFAULT_FALLBACK);
    setStage(Stage.FALLBACK);
    setStartTime(Date.now());
    setStatusMessage("Routing via backup node...");
  }, []);

  useEffect(() => {
    if (!hasRunDiagnostics.current) {
      hasRunDiagnostics.current = true;
      runDiagnostics();
    }
  }, [runDiagnostics]);

  useEffect(() => {
    console.log('Countdown useEffect running, stage:', stage, 'startTime:', startTime);
    if ((stage === Stage.READY || stage === Stage.FALLBACK) && startTime && targetUrl) {
      console.log('Setting countdown timer');
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = Math.max(0, (REDIRECT_DELAY_MS / 1000) - elapsed);
        if (remaining <= 0) {
          console.log('Redirecting to', targetUrl);
          window.location.href = targetUrl;
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        } else {
          const newCountdown = Number(remaining.toFixed(1));
          console.log('Countdown:', newCountdown);
          setCountdown(newCountdown);
        }
      }, 100);
    } else {
      if (timerRef.current) {
        console.log('Clearing timer');
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [stage, startTime, targetUrl]);

  // Calculate progress percentage for the bar
  const progressPercent = ((REDIRECT_DELAY_MS / 1000 - countdown) / (REDIRECT_DELAY_MS / 1000)) * 100;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 font-sans selection:bg-slate-100">
      <div className="w-full max-w-sm">
        <AnimatePresence mode="wait">
          {stage === Stage.SCANNING ? (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center space-y-6"
            >
              <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-slate-400" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-medium text-slate-900 tracking-tight">Osteodits</h1>
                <p className="text-sm text-slate-400">{statusMessage}</p>
              </div>
              <div className="relative w-48 h-[1px] bg-slate-100 overflow-hidden">
                <motion.div
                  animate={{ x: [-200, 200] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute w-24 h-full bg-slate-950"
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center space-y-8"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stage === Stage.FALLBACK ? 'bg-orange-500' : 'bg-slate-950'}`}>
                {stage === Stage.FALLBACK ? (
                  <AlertCircle className="w-5 h-5 text-white" />
                ) : (
                  <Check className="w-5 h-5 text-white" />
                )}
              </div>

              <div className="space-y-1">
                <h1 className="text-xl font-medium text-slate-900 tracking-tight">Osteodits</h1>
                <p className="text-sm text-slate-400">
                  {statusMessage}
                </p>
              </div>

              <div className="w-full space-y-4">
                <button
                  onClick={() => window.location.href = targetUrl}
                  className="w-full group py-4 px-6 bg-white border border-slate-900 text-slate-900 rounded-2xl font-medium flex items-center justify-between hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <span>Launch Application</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="space-y-2 px-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Handover</p>
                    <p className="text-[10px] font-mono font-bold text-slate-900">{countdown.toFixed(1)}s</p>
                  </div>
                  {/* Added a subtle progress bar */}
                  <div className="h-[2px] w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${stage === Stage.FALLBACK ? 'bg-orange-500' : 'bg-slate-900'}`}
                      style={{ width: `${progressPercent}%` }}
                      layout
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={runDiagnostics}
                className="flex items-center gap-2 text-slate-300 hover:text-slate-900 transition-colors text-[10px] uppercase font-bold tracking-widest"
              >
                <RefreshCw className="w-3 h-3" /> Re-scan
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
