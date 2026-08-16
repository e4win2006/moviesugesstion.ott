import { AppShell } from "@/components/app-shell";
import { getSessionProfileId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NeuralRecommenderProvider } from "@/components/neural-recommender-provider";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const profileId = await getSessionProfileId();
  const profile = profileId
    ? await prisma.profile.findUnique({ where: { id: profileId }, select: { name: true } }).catch(() => null)
    : null;
  return (
    <NeuralRecommenderProvider>
      <AppShell profileName={profile?.name || "Viewer"}>{children}</AppShell>
    </NeuralRecommenderProvider>
  );
}
