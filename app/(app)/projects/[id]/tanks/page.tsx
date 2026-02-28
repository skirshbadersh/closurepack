export default async function TanksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <div>UST Inventory: {id}</div>;
}
