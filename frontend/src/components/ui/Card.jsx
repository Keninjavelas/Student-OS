function Card({ children, className = "" }) {
  return (
    <div className={`rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800 ${className}`}>
      {children}
    </div>
  );
}

export default Card;
