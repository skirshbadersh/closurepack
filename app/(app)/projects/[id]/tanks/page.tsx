import { getProjectTanks } from "@/lib/actions/tanks";
import { TankList } from "@/components/projects/tank-list";

export default async function TanksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tanks = await getProjectTanks(id);

  return <TankList projectId={id} initialTanks={tanks} />;
}
