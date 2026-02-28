import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Project, Jurisdiction, UST, ParallelPermit } from "@/types";

/** Format a date string as "Month Day, Year" */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "[date not set]";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Compute 36-month retention end date from a base date */
function retentionEndDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "[date not set]";
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + 36);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Format closure type */
function closureTypeLabel(type: string | null): string {
  if (type === "removal") return "Removal";
  if (type === "closure_in_place") return "Closure in Place";
  return "Unknown";
}

/** Word-wrap text into lines fitting maxWidth */
function wrapText(
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  text: string,
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Generate a Submission Checklist PDF with CERS instructions.
 */
export async function generateSubmissionChecklist(
  project: Project,
  jurisdiction: Jurisdiction,
  tanks: UST[],
  parallelPermits: ParallelPermit[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 60;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 16;
  const black = rgb(0, 0, 0);
  const darkGray = rgb(0.25, 0.25, 0.25);
  const blue = rgb(0.1, 0.3, 0.6);

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function ensureSpace(needed: number) {
    if (y - needed < margin + 20) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  }

  function drawText(
    text: string,
    x: number,
    yPos: number,
    options: {
      font?: typeof font;
      size?: number;
      color?: ReturnType<typeof rgb>;
    } = {}
  ) {
    page.drawText(text, {
      x,
      y: yPos,
      size: options.size ?? 10,
      font: options.font ?? font,
      color: options.color ?? darkGray,
    });
  }

  function drawWrapped(
    text: string,
    x: number,
    options: { font?: typeof font; size?: number; color?: ReturnType<typeof rgb>; indent?: number } = {}
  ) {
    const f = options.font ?? font;
    const s = options.size ?? 10;
    const maxW = contentWidth - (options.indent ?? 0);
    const lines = wrapText(f, text, s, maxW);
    for (const line of lines) {
      ensureSpace(lineHeight);
      drawText(line, x, y, { font: f, size: s, color: options.color });
      y -= lineHeight;
    }
  }

  function drawStep(number: number, text: string) {
    ensureSpace(lineHeight * 2);
    const label = `${number}.`;
    drawText(label, margin, y, { font: fontBold, size: 11, color: blue });
    y -= lineHeight;
    drawWrapped(text, margin + 20, { indent: 20 });
    y -= 6;
  }

  // --- Title ---
  const title = "CERS Submission Checklist";
  const titleSize = 18;
  const titleWidth = fontBold.widthOfTextAtSize(title, titleSize);
  drawText(title, (pageWidth - titleWidth) / 2, y, {
    font: fontBold,
    size: titleSize,
    color: black,
  });
  y -= 8;

  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1.5,
    color: blue,
  });
  y -= 24;

  // --- Facility Info ---
  const facilityName = project.facility_name || "[Facility Name]";
  drawText(`Facility: ${facilityName}`, margin, y, { font: fontBold, size: 11 });
  y -= lineHeight;

  const addr = [project.facility_street, project.facility_city, project.facility_state, project.facility_zip]
    .filter(Boolean)
    .join(", ");
  if (addr) {
    drawText(`Address: ${addr}`, margin, y, { size: 10 });
    y -= lineHeight;
  }

  if (project.facility_file_number) {
    drawText(`File No.: ${project.facility_file_number}`, margin, y, { size: 10 });
    y -= lineHeight;
  }

  drawText(`CUPA: ${jurisdiction.cupa_name}`, margin, y, { size: 10 });
  y -= lineHeight * 2;

  // --- Steps ---
  page.drawLine({
    start: { x: margin, y: y + 8 },
    end: { x: pageWidth - margin, y: y + 8 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 8;

  drawStep(
    1,
    `Log into CERS at https://cers.calepa.ca.gov using your authorized credentials.`
  );

  drawStep(
    2,
    `Navigate to your facility (${facilityName}) and click "Start Facility Submittal."`
  );

  drawStep(
    3,
    `Start a new UST submittal based on the most recently accepted submittal for this facility.`
  );

  drawStep(
    4,
    `Select "Confirmed/Updated Information" as the Type of Action for this submittal.`
  );

  // Step 5: Per-tank instructions
  ensureSpace(lineHeight * 2);
  const stepLabel = "5.";
  drawText(stepLabel, margin, y, { font: fontBold, size: 11, color: blue });
  y -= lineHeight;
  drawWrapped(
    "For each tank listed below, edit the Tank Information/Monitoring Plan, select the closure type, and enter the closure date:",
    margin + 20,
    { indent: 20 }
  );
  y -= 4;

  if (tanks.length === 0) {
    ensureSpace(lineHeight);
    drawText("  [No tanks entered — add tanks in the Tanks tab]", margin + 30, y, {
      color: rgb(0.7, 0.2, 0.2),
      size: 10,
    });
    y -= lineHeight;
  } else {
    for (const tank of tanks) {
      ensureSpace(lineHeight * 2);
      const tankId = tank.cers_tank_id || tank.internal_tank_label || "—";
      const contents = tank.contents || "—";
      const cDate = formatDate(tank.closure_date);
      const cType = closureTypeLabel(tank.closure_type);

      drawText(`• Tank ${tankId}`, margin + 30, y, { font: fontBold, size: 10 });
      y -= lineHeight;
      drawText(
        `Contents: ${contents}  |  Closure Date: ${cDate}  |  Type: ${cType}`,
        margin + 40,
        y,
        { size: 9 }
      );
      y -= lineHeight + 2;
    }
  }
  y -= 4;

  drawStep(
    6,
    `Submit the updated UST submittal in CERS and follow up with ${jurisdiction.cupa_name} to confirm acceptance.`
  );

  // Step 7: Parallel permits
  ensureSpace(lineHeight * 2);
  drawText("7.", margin, y, { font: fontBold, size: 11, color: blue });
  y -= lineHeight;
  drawWrapped("Verify the following parallel permits and clearances:", margin + 20, { indent: 20 });
  y -= 4;

  if (parallelPermits.length === 0) {
    ensureSpace(lineHeight);
    drawText("  No parallel permits configured for this jurisdiction.", margin + 30, y, { size: 10 });
    y -= lineHeight;
  } else {
    for (const permit of parallelPermits) {
      ensureSpace(lineHeight * 2);
      drawText(`• ${permit.permit_type}`, margin + 30, y, { font: fontBold, size: 10 });
      y -= lineHeight;
      drawText(`Agency: ${permit.agency_name}`, margin + 40, y, { size: 9 });
      y -= lineHeight;
      if (permit.description) {
        drawWrapped(permit.description, margin + 40, { size: 9, indent: 40 });
      }
      y -= 2;
    }
  }
  y -= 4;

  // Step 8: Report deadline
  const deadline = project.report_deadline
    ? formatDate(project.report_deadline)
    : "[deadline not computed — check CUPA rules]";
  drawStep(
    8,
    `Report deadline: ${deadline}. Submit your closure report to ${jurisdiction.cupa_name} by this date.`
  );

  // Step 9: Record retention
  const earliestClosureDate = tanks
    .map((t) => t.closure_date)
    .filter(Boolean)
    .sort()[0];
  const retentionEnd = retentionEndDate(earliestClosureDate ?? project.sampling_date);
  drawStep(
    9,
    `Record retention: Maintain all analytical results, chain-of-custody forms, and closure documentation for at least 36 months (until ${retentionEnd}).`
  );

  // --- Footer note ---
  y -= lineHeight;
  ensureSpace(lineHeight * 3);
  page.drawLine({
    start: { x: margin, y: y + 8 },
    end: { x: pageWidth - margin, y: y + 8 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 8;
  drawWrapped(
    "This checklist was generated by ClosurePack. It is provided as a guide and does not constitute legal or regulatory advice. Consult your CUPA for specific requirements.",
    margin,
    { size: 8, color: rgb(0.5, 0.5, 0.5) }
  );

  return pdfDoc.save();
}
