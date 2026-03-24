function Toggle({ label, checked, onChange, id }) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
    >
      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span>
      <span className="relative inline-flex items-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-gray-300 transition peer-checked:bg-indigo-600" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export default Toggle;
