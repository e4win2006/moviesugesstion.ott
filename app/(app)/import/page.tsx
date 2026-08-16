import { ImportTools } from "@/components/import-tools";

export default function ImportPage() {
  return (
    <div className="py-6">
      <p className="eyebrow">Train the anti-repeat engine</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Import your watch history.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">The more Edwin&apos;s Watch Advisor knows, the less likely an old recommendation slips through. Imports are deduplicated by IMDb ID when available.</p>
      <ImportTools />
    </div>
  );
}
