export function ScoreRing({ score, size = "md" }: { score: number; size?: "sm" | "md" }) {
  return (
    <div className={`grid ${size === "sm" ? "h-9 w-9 text-[10px]" : "h-12 w-12 text-xs"} place-items-center rounded-full border-[3px] border-lime bg-[#11150f] font-black text-white shadow-lg`}>
      {score}
    </div>
  );
}
