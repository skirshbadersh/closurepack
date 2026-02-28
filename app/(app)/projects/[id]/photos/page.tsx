import { getProjectPhotos } from "@/lib/actions/photos";
import { PhotoGrid } from "@/components/projects/photo-grid";

export default async function PhotosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const photos = await getProjectPhotos(id);

  return <PhotoGrid projectId={id} initialPhotos={photos} />;
}
