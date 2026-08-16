import { getAdvisorData } from "@/lib/data";
import { SearchBrowser } from "@/components/search-browser";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const data = await getAdvisorData();
  return (
    <div className="py-6">
      <p className="eyebrow">Deep catalog search</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">Find exactly your kind of story.</h1>
      <SearchBrowser items={data.titles} />
    </div>
  );
}
