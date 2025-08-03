import React, { createContext, useContext } from "react";
import { supabase } from "@/lib/supabase/client";

const SupabaseContext = createContext({ supabase });

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <SupabaseContext.Provider value={{ supabase }}>
    {children}
  </SupabaseContext.Provider>
);

// eslint-disable-next-line react-refresh/only-export-components
export const useSupabase = () => useContext(SupabaseContext);
