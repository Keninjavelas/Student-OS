function Toast({ message, tone = "success" }) {
  const toneClasses =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
      : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";

  if (!message) return null;

  return <div className={`rounded-lg border px-3 py-2 text-sm ${toneClasses}`}>{message}</div>;
}

export default Toast;
