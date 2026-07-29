"use server";

import { signOut } from "@/auth";

/* Signing out is a state change, so it goes through a POST action
   rather than a GET route. A <Link> would be prefetched on hover,
   which could sign you out just by moving the mouse. */
export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
