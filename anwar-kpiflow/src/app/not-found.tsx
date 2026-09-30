import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center"><ShieldAlert className="h-6 w-6" /></div>
      <h1 className="mt-4 text-[20px] font-semibold text-ink-900">This record is not available to you</h1>
      <p className="mt-1.5 text-[14px] text-ink-500 max-w-md">It either does not exist or belongs to a department outside your access. Department scoping is enforced on the server for every page, request and file.</p>
      <Link href="/" className="mt-6 inline-flex items-center h-10 px-4 rounded-lg bg-brand-700 text-white text-[14px] font-medium hover:bg-brand-800">Go to your home screen</Link>
    </div>
  );
}
