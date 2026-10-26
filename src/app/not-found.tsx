import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="font-mono text-[15px] text-muted">404</p>
      <h1 className="text-base font-semibold">Not found</h1>
      <p className="text-[13px] text-muted">That task, page or record doesn&apos;t exist (or was deleted).</p>
      <Link href="/" className="mt-2 text-[13px] text-info hover:underline">Back to overview</Link>
    </div>
  );
}
