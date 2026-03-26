/**
 * Session context for global authentication state.
 *
 * This file manages client-side session data such as:
 * - Current user type (home vs company)
 * - Active access token
 * - Logout behavior
 *
 * It is intentionally lightweight and does NOT persist data;
 * persistence and token hydration are handled elsewhere.
 */

/**
 * Supported user types for routing and access control.
 * `null` represents a logged-out or uninitialized session.
 */
import { storage } from "@/src/platform/storage";
import { getCurrentSessionToken, signOut } from "@/src/utils/auth";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type UserType = "home" | "company" | null;


/**
 * Shape of the session context exposed to the app.
 * Used by routing guards, layouts, and auth-dependent screens.
 */
type SessionContextValue = {
  userType: UserType;
  setUserType: (t: UserType) => void;
    accessToken: string | null;
    setAccessToken: (token: string | null) => void;
  
  isHydrated: boolean;
  logout: () => Promise<void>;
};

const STORAGE_KEYS = {
    USER_TYPE: "session:userType",
} as const;

/**
 * React context holding the current session state.
 * Initialized as null to enforce provider usage.
 */
const SessionContext = createContext<SessionContextValue | null>(null);


/**
 * Provides session state to the application tree.
 * Stores user type and access token in memory and exposes
 * a centralized logout method that clears both.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
    const [userType, setUserType] = useState<UserType>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        let alive = true;

        const hydrateSession = async () => {
            try {
                const [token, storedUserType] = await Promise.all([
                    getCurrentSessionToken(),
                    storage.getItem(STORAGE_KEYS.USER_TYPE),
                ]);

                if (!alive) return;

                if (token && token.length > 0) {
                    setAccessToken(token);
                } else {
                    setAccessToken(null);
                }
                if (storedUserType === "home" || storedUserType === "company") {
                    setUserType(storedUserType);
                }
            } catch {
                // no-op: app should continue even if local session restore fails
            } finally {
                if (alive) setIsHydrated(true);
            }
        };

        hydrateSession();

        return () => {
            alive = false;
        };
    }, []);

    const setUserTypeWithPersist = useCallback((t: UserType) => {
        setUserType(t);
        if (t) void storage.setItem(STORAGE_KEYS.USER_TYPE, t);
        else void storage.removeItem(STORAGE_KEYS.USER_TYPE);
    }, []);

     /**
     * Memoized context value to avoid unnecessary re-renders
     * when unrelated parts of the app update.
     */
    const value = useMemo(() => ({
        userType,
        setUserType: setUserTypeWithPersist,
        accessToken,
        setAccessToken,
        isHydrated,
             /**
             * Clears all session state.
             * Used when logging out or invalidating a session.
             */
            logout: async () => {
                try {
                    await signOut();
                } finally {
                    setUserTypeWithPersist(null);
                    setAccessToken(null);
                }
            }
        }),
        [userType, accessToken, isHydrated, setUserTypeWithPersist]
    );

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/**
 * Hook for accessing session state.
 * Must be used within a SessionProvider.
 */
export function useSession() {
    const ctx = useContext(SessionContext);
    if (!ctx) throw new Error("useSession must be used within SessionProvider");
    return ctx;
}
