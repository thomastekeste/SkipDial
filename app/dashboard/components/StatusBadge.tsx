import { STATUS_STYLES } from "../lib/constants";

export function StatusBadge({ status, isDark }: { status: string; isDark: boolean }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES["NEW LEAD"];
  return (
    <span
      className="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider"
      style={{
        backgroundColor: isDark ? style.darkBg : style.bg,
        color: isDark ? style.darkText : style.text,
      }}
    >
      {status}
    </span>
  );
}
