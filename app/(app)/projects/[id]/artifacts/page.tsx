export default async function ArtifactsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <div>Upload + Tag Artifacts: {id}</div>;
}
