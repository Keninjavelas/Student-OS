function RouteSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-32 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
        <div className="h-32 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
        <div className="h-32 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
      </div>
    </div>
  );
}

export default RouteSkeleton;
