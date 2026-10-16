export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: { access_token: "synthetic-no-real-token" } } }),
  },
};
