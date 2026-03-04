import { useSession } from "@/src/state/session";
import { Slot, useRouter } from "expo-router";
import { useEffect, useRef } from "react";

export function RequireUserType({ type }: { type: "home" | "company" }) {
  const { userType, isLoading } = useSession(); // make sure session exposes isLoading
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    if (hasRedirected.current) return;

    if (userType === null) {
      hasRedirected.current = true;
      router.replace("/(auth)/login");
      return;
    }

    if (userType !== type) {
      hasRedirected.current = true;
      router.replace(
        userType === "company" ? "/(companyUser)" : "/(homeUser)"
      );
    }
  }, [userType, isLoading, type]);

  return null;
}

