/** Skeleton shown while an /app page loads (PRD-app section 12). */
export default function AppLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-4">
      <div className="h-8 w-48 rounded-md bg-line" />
      <div className="h-4 w-72 max-w-full rounded-md bg-line" />
      <div className="mt-6 h-24 rounded-md border border-line" />
      <div className="h-24 rounded-md border border-line" />
    </div>
  );
}
