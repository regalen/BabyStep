import { createAuthClient } from "better-auth/react";

// No baseURL — the client uses window.location.origin automatically,
// so the app works on any hostname/IP/port without configuration.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
