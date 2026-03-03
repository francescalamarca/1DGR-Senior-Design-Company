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
import React, { createContext, useContext, useMemo, useState } from "react";

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
    logout: () => void;
};

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
    const [userType, setUserType] = useState<UserType>("company"); //hardcoding this here to work for our side
    const [accessToken, setAccessToken] = useState<string | null>(null);

     /**
     * Memoized context value to avoid unnecessary re-renders
     * when unrelated parts of the app update.
     */
    const value = useMemo(
        () => ({
            userType,
            setUserType,
            accessToken,
            setAccessToken,
             /**
             * Clears all session state.
             * Used when logging out or invalidating a session.
             */
            logout: () => {
                setUserType(null);
                setAccessToken(null);
            },
        }),
        [userType, accessToken]
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