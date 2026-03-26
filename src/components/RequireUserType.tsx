/**
 * - Route guard component that ensures the current user matches the required user type
 *   ("home" or "company") before allowing access to a screen/layout.
 * - Redirects unauthenticated users to the login flow.
 * - Redirects authenticated users to their correct root tab group if they attempt to access
 *   a route meant for the other user type.
 */
import { useSession } from "@/src/state/session";

export function RequireUserType({ type }: { type: "home" | "company" }) {
     /**
   * Reads the current user's type from session state.
   * `null` indicates no authenticated session yet.
   */
    const { userType, isHydrated } = useSession();
    if (!isHydrated) return null;
  /**
   * If no user type is present, force the user into the auth/login flow.
   */
    if (userType === null) return null;
  /**
   * If the user is authenticated but on the wrong route group,
   * redirect them to their correct root navigator.
   */
   // if (userType !== type) {
   //     return <Redirect href={userType === "company" ? "/(companyUser)" : "/(homeUser)"} />;
   // }
  /**
   * User is authorized for this route; render nothing and allow children/layout to load.
   */
    return null;
}
