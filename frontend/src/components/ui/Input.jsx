function Input({ label, id, className = "", ...props }) {
  return (
    <label className="block">
      {label ? (
        <span className="text-sm font-medium text-gray-700" id={`${id}-label`}>
          {label}
        </span>
      ) : null}
      <input
        id={id}
        aria-labelledby={label ? `${id}-label` : undefined}
        className={`mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 ${className}`}
        {...props}
      />
    </label>
  );
}

export default Input;
