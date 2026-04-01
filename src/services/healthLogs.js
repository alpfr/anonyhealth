import { supabase } from "../supabaseClient";

/**
 * Insert a health log entry for the current user.
 * @param {string} userId - The user's ID
 * @param {object} logEntry - { symptom, severity, ai_advice }
 */
export const insertHealthLog = async (userId, { symptom, severity, ai_advice }) => {
  if (!userId || !severity) return { error: "Missing required fields" };

  try {
    const { data, error } = await supabase.from("health_logs").insert({
      user_id: userId,
      symptom: sanitizeText(symptom || "Triage Session"),
      severity: Math.min(10, Math.max(1, parseInt(severity, 10))),
      ai_advice: sanitizeText(ai_advice || ""),
    });

    if (error) console.error("Health log insert error:", error);
    return { data, error };
  } catch (err) {
    console.error("Health log insert failed:", err);
    return { error: err.message };
  }
};

/**
 * Fetch health logs for a user, ordered by most recent.
 * @param {string} userId - The user's ID
 * @param {number} limit - Max number of logs to return (default 20)
 */
export const fetchHealthLogs = async (userId, limit = 20) => {
  if (!userId) return { data: [], error: "No user ID" };

  try {
    const { data, error } = await supabase
      .from("health_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Health log fetch error:", error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error("Health log fetch failed:", err);
    return { data: [], error: err.message };
  }
};

/**
 * Basic text sanitization — strips script tags and trims.
 */
const sanitizeText = (text) => {
  if (!text) return "";
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/[<>]/g, "")
    .trim();
};
