import { auth } from "../firebaseConfig.ts";
import { onAuthStateChanged } from "firebase/auth";

/**
 * Mimics Supabase auth.getUser()
 */
export const getUser = async () => {
  const user = auth.currentUser;

  return {
    data: {
      user: user
        ? {
            id: user.uid,
            email: user.email,
            user_metadata: user.providerData?.[0] || {},
          }
        : null,
    },
    error: null,
  };
};

/**
 * Mimics Supabase auth.getSession()
 */
export const getSession = async () => {
  const user = auth.currentUser;

  return {
    data: {
      session: user
        ? {
            user: {
              id: user.uid,
              email: user.email,
            },
            access_token: await user.getIdToken(),
          }
        : null,
    },
    error: null,
  };
};

/**
 * Mimics Supabase auth.getClaims()
 */
export const getClaims = async () => {
  const user = auth.currentUser;

  if (!user) return { data: null, error: "No user" };

  const token = await user.getIdTokenResult();

  return {
    data: {
      claims: token.claims,
    },
    error: null,
  };
};