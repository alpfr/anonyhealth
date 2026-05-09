import { T } from "../constants/theme";

/**
 * ScreenLoader — minimal loading fallback used by Suspense boundaries.
 */
export const ScreenLoader = ({ theme }) => {
  const t = T[theme] || T.light;
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Outfit', sans-serif",
        color: t.textMut,
        fontSize: 14,
      }}
    >
      Loading...
    </div>
  );
};
