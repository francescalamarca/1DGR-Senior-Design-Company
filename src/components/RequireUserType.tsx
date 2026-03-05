import { useSession} from "@/src/state/session";
import { Slot, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

export function RequireUserType({ type }: { type: "home" | "company" }) {
  const { userType:_userType} = useSession(); // make sure session exposes isLoading, got rid of it for testing purposes don't need here
  const router = useRouter();
  const hasRedirected = useRef(false);
  const [mounted, setMounted] = useState(false);

  //DEV OVERRIDE
  const userType = "company";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if(!mounted) return; //not ready will return

    if (hasRedirected.current) return;

    if (userType !== type) {
      hasRedirected.current = true;
      router.replace("/(companyUser)");
    }
  }, [mounted, userType, type]);

  return null;
}

