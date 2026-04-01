import { supabase } from "../supabaseClient";
import { PROVIDERS } from "../data/providers";

/**
 * Fetch providers from the database with fallback to local mock data.
 * @returns {Promise<Array>} Array of provider objects
 */
export const fetchProviders = async () => {
  try {
    const { data, error } = await supabase
      .from("providers")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Error fetching providers:", error);
      return PROVIDERS; // fallback to local data
    }

    return data && data.length > 0 ? data : PROVIDERS;
  } catch (err) {
    console.error("Provider fetch failed:", err);
    return PROVIDERS;
  }
};
