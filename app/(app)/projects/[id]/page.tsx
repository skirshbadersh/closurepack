export default function ProjectOverviewPage({
  params,
}: {
  params: { id: string };
}) {
  return <div>Project Overview + Checklist: {params.id}</div>;
}
