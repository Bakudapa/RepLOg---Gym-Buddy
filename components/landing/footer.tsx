export function Footer() {
  return (
    <footer className="border-t border-line pb-[env(safe-area-inset-bottom)]">
      <div className="container-page flex flex-col gap-4 py-10 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-fg">RepLog</p>
          <p className="mt-1">
            A free gym log. A portfolio project by Dafa Wahyu Ananta.
          </p>
        </div>
        <p>© 2026 Dafa Wahyu Ananta</p>
      </div>
    </footer>
  );
}
