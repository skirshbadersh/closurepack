import { getProject, getProjectJurisdiction } from "@/lib/actions/projects";
import { getProjectTanks } from "@/lib/actions/tanks";
import { getProjectPhotos } from "@/lib/actions/photos";
import { DocumentCard } from "@/components/projects/document-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await getProject(id);
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-6 text-center">
        <h2 className="text-lg font-semibold mb-1">Project not found</h2>
      </div>
    );
  }

  // Fetch data needed for missing field checks
  const [jurisdiction, tanks, photos] = await Promise.all([
    project.jurisdiction_id
      ? getProjectJurisdiction(project.jurisdiction_id)
      : null,
    getProjectTanks(id),
    getProjectPhotos(id),
  ]);

  // --- Compute missing fields for each document ---

  // Closure Letter
  const closureLetterMissing: string[] = [];
  if (!project.owner_operator_name) closureLetterMissing.push("Owner/Operator Name");
  if (!project.owner_operator_street) closureLetterMissing.push("Owner/Operator Street");
  if (!project.owner_operator_city) closureLetterMissing.push("Owner/Operator City");
  if (!project.owner_operator_zip) closureLetterMissing.push("Owner/Operator ZIP");
  if (!project.facility_name) closureLetterMissing.push("Facility Name");
  if (!project.facility_street) closureLetterMissing.push("Facility Street");
  if (!project.facility_city) closureLetterMissing.push("Facility City");
  if (!project.facility_zip) closureLetterMissing.push("Facility ZIP");
  if (!jurisdiction) closureLetterMissing.push("CUPA Jurisdiction");
  if (jurisdiction && !jurisdiction.oversight_agency)
    closureLetterMissing.push("Oversight Agency");
  if (jurisdiction && !jurisdiction.cupa_contact_name)
    closureLetterMissing.push("CUPA Contact Name");
  if (jurisdiction && !jurisdiction.cupa_contact_phone)
    closureLetterMissing.push("CUPA Contact Phone");
  if (tanks.length === 0) closureLetterMissing.push("At least 1 tank");

  // Cover Sheet
  const coverSheetMissing: string[] = [];
  if (!project.facility_name) coverSheetMissing.push("Facility Name");
  if (!project.closure_type) coverSheetMissing.push("Closure Type");
  if (!jurisdiction) coverSheetMissing.push("CUPA Jurisdiction");

  // Photo Log
  const photoLogMissing: string[] = [];
  if (photos.length === 0) photoLogMissing.push("At least 1 photo");

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Generated Documents</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Preview and download the generated PDF documents for this closure
            package. Missing fields will be highlighted in red within the PDFs.
            All documents include a DRAFT watermark.
          </p>
        </CardContent>
      </Card>

      {/* Document Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DocumentCard
          projectId={id}
          docType="closure-letter"
          title="Closure Letter (DRAFT)"
          description="Formal UST closure notification letter using the State Water Board template. Includes tank table, CUPA contact, and DRAFT watermark."
          missingFields={closureLetterMissing}
        />
        <DocumentCard
          projectId={id}
          docType="cover-sheet"
          title="Cover Sheet & TOC"
          description="Cover page with facility info and a table of contents listing all documents in the closure package."
          missingFields={coverSheetMissing}
        />
        <DocumentCard
          projectId={id}
          docType="photo-log"
          title="Photo Log"
          description="Photo log with 2 photos per page, including captions, dates, and photo numbers."
          missingFields={photoLogMissing}
        />
      </div>
    </div>
  );
}
