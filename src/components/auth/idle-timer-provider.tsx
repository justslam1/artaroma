'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldAlert, Clock, LogOut, CheckCircle2 } from 'lucide-react';

const LAST_ACTIVITY_KEY = 'artaroma_last_activity';
const AUTH_CHANNEL_NAME = 'artaroma_auth_broadcast';
const DEFAULT_TIMEOUT_MINUTES = 240; // 4 hours default
const WARNING_THRESHOLD_SECONDS = 60; // 60 seconds warning modal

export function IdleTimerProvider() {
  const pathname = usePathname();
  const router = useRouter();

  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(DEFAULT_TIMEOUT_MINUTES);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(WARNING_THRESHOLD_SECONDS);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isLoginPage = pathname === '/login';

  // 1. Fetch company auto_logout_minutes setting
  const fetchTimeoutSetting = useCallback(async () => {
    try {
      const res = await fetch('/api/company-settings', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.auto_logout_minutes) {
          const mins = parseInt(json.data.auto_logout_minutes, 10);
          if (!isNaN(mins) && mins > 0) {
            setTimeoutMinutes(mins);
          }
        }
      }
    } catch {
      // Keep default 240 minutes
    }
  }, []);

  // 2. Check if user is currently authenticated
  const checkAuthStatus = useCallback(async () => {
    if (isLoginPage) {
      setIsLoggedIn(false);
      setShowWarning(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.user) {
          setIsLoggedIn(true);
          return;
        }
      }
      setIsLoggedIn(false);
    } catch {
      setIsLoggedIn(false);
    }
  }, [isLoginPage]);

  // 3. Record user activity and broadcast to other tabs
  const recordActivity = useCallback((isExplicit = false) => {
    if (isLoginPage) return;

    const now = Date.now();
    // Throttle automatic events to once every 2 seconds, but always allow explicit actions
    if (!isExplicit && now - lastActivityRef.current < 2000) {
      return;
    }

    lastActivityRef.current = now;
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    } catch {}

    // Broadcast activity to other tabs
    if (channelRef.current) {
      channelRef.current.postMessage({ type: 'ACTIVITY_PING', timestamp: now });
    }

    // Dismiss warning modal if active
    setShowWarning(false);
  }, [isLoginPage]);

  // 4. Perform logout action
  const performLogout = useCallback(async (reason = 'idle_timeout') => {
    try {
      // Broadcast logout to all other open tabs
      if (channelRef.current) {
        channelRef.current.postMessage({ type: 'LOGOUT_EVENT', reason });
      }

      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      setIsLoggedIn(false);
      setShowWarning(false);
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      router.push(`/login?reason=${reason}`);
    }
  }, [router]);

  // 5. Initialize BroadcastChannel & storage event listeners
  useEffect(() => {
    fetchTimeoutSetting();
    checkAuthStatus();

    // Listen to company settings updates
    const handleSettingsUpdated = () => {
      fetchTimeoutSetting();
    };
    window.addEventListener('artaroma_company_settings_updated', handleSettingsUpdated);

    // Initialize BroadcastChannel if supported
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      channelRef.current = channel;

      channel.onmessage = (event) => {
        const { type, timestamp, reason } = event.data || {};
        if (type === 'ACTIVITY_PING' && timestamp) {
          lastActivityRef.current = Math.max(lastActivityRef.current, timestamp);
          setShowWarning(false);
        } else if (type === 'LOGOUT_EVENT') {
          setIsLoggedIn(false);
          setShowWarning(false);
          router.push(`/login?reason=${reason || 'idle_timeout'}`);
        }
      };
    }

    // Storage event fallback for multi-tab synchronization
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
        const ts = parseInt(e.newValue, 10);
        if (!isNaN(ts)) {
          lastActivityRef.current = Math.max(lastActivityRef.current, ts);
          setShowWarning(false);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('artaroma_company_settings_updated', handleSettingsUpdated);
      window.removeEventListener('storage', handleStorageChange);
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, [fetchTimeoutSetting, checkAuthStatus, router]);

  // 6. User interaction event listeners
  useEffect(() => {
    if (isLoginPage || !isLoggedIn) return;

    // Set initial timestamp
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    } catch {}

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const onUserAction = () => recordActivity(false);

    events.forEach((evt) => {
      window.addEventListener(evt, onUserAction, { passive: true });
    });

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, onUserAction);
      });
    };
  }, [isLoginPage, isLoggedIn, recordActivity]);

  // 7. Core timer interval checking
  useEffect(() => {
    if (isLoginPage || !isLoggedIn) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    const checkInactivity = () => {
      // Re-read latest activity timestamp from localStorage
      let latestActivity = lastActivityRef.current;
      try {
        const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed > latestActivity) {
            latestActivity = parsed;
            lastActivityRef.current = parsed;
          }
        }
      } catch {}

      const timeoutMs = timeoutMinutes * 60 * 1000;
      const elapsedMs = Date.now() - latestActivity;
      const remainingMs = timeoutMs - elapsedMs;
      const remainingSec = Math.ceil(remainingMs / 1000);

      if (remainingMs <= 0) {
        // Inactivity timeout reached -> logout
        performLogout('idle_timeout');
      } else if (remainingSec <= WARNING_THRESHOLD_SECONDS) {
        // Show warning countdown modal
        setShowWarning(true);
        setSecondsRemaining(Math.max(1, remainingSec));
      } else {
        setShowWarning(false);
      }
    };

    // Run check every 1 second
    timerIntervalRef.current = setInterval(checkInactivity, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isLoginPage, isLoggedIn, timeoutMinutes, performLogout]);

  // If not logged in or on login page, render nothing
  if (isLoginPage || !isLoggedIn || !showWarning) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
        {/* Warning Icon Badge */}
        <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600 shadow-inner">
          <ShieldAlert className="w-8 h-8 animate-pulse" />
        </div>

        {/* Title and Description */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-slate-900">
            Peringatan Sesi Tidak Aktif
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tidak ada aktivitas yang terdeteksi. Demi keamanan data perusahaan, sesi Anda akan berakhir otomatis dalam:
          </p>
        </div>

        {/* Countdown Badge */}
        <div className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700">
          <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
          <span className="text-2xl font-black tabular-nums tracking-wider text-amber-800">
            {secondsRemaining} Detik
          </span>
        </div>

        <p className="text-[11px] text-slate-400">
          Sinkronisasi multi-tab aktif. Klik <strong>Tetap Masuk</strong> untuk memperpanjang sesi di seluruh tab.
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => performLogout('manual')}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout Sekarang
          </button>
          <button
            type="button"
            onClick={() => recordActivity(true)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Tetap Masuk
          </button>
        </div>
      </div>
    </div>
  );
}
