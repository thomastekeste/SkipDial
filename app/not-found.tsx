import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <h1 className="mb-2 text-6xl font-black text-zinc-900 dark:text-white">404</h1>
      <p className="mb-8 text-lg text-zinc-500 dark:text-zinc-400">Page not found</p>
      <Link
        href="/"
        className="rounded-xl bg-[#22C55E] px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#22C55E]/25 transition-all hover:bg-[#16A34A] active:scale-[0.98]"
      >
        Back to Home
      </Link>
    </div>
  );
}
