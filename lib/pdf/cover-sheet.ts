import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import type { Project, Jurisdiction } from "@/types";

/** Format closure type for display */
function closureTypeLabel(type: string | null): string {
  if (type === "removal") return "Removal";
  if (type === "closure_in_place") return "Closure in Place";
  return "Unknown";
}

/**
 * Generate a Cover Sheet + Table of Contents PDF.
 */
export async function generateCoverSheet(
  project: Project,
  jurisdiction: Jurisdiction
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 72;
  const black = rgb(0, 0, 0);
  const darkGray = rgb(0.3, 0.3, 0.3);
  const lightGray = rgb(0.6, 0.6, 0.6);

  // ===== PAGE 1: Cover Sheet =====
  const coverPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 160;

  // Title
  const title = "UST Closure Report";
  const titleSize = 28;
  const titleWidth = fontBold.widthOfTextAtSize(title, titleSize);
  coverPage.drawText(title, {
    x: (pageWidth - titleWidth) / 2,
    y,
    size: titleSize,
    font: fontBold,
    color: black,
  });
  y -= 12;

  // Decorative line
  coverPage.drawLine({
    start: { x: margin + 60, y },
    end: { x: pageWidth - margin - 60, y },
    thickness: 2,
    color: rgb(0.2, 0.4, 0.6),
  });
  y -= 50;

  // Facility name
  const facilityName = project.facility_name || "Untitled Facility";
  const facilitySize = 20;
  const facilityWidth = fontBold.widthOfTextAtSize(facilityName, facilitySize);
  coverPage.drawText(facilityName, {
    x: (pageWidth - facilityWidth) / 2,
    y,
    size: facilitySize,
    font: fontBold,
    color: darkGray,
  });
  y -= 30;

  // Facility address
  const addrParts = [
    project.facility_street,
    project.facility_city,
    project.facility_state,
    project.facility_zip,
  ].filter(Boolean);
  if (addrParts.length > 0) {
    const addr = `${project.facility_street || ""}, ${project.facility_city || ""}, ${project.facility_state || ""} ${project.facility_zip || ""}`;
    const addrWidth = font.widthOfTextAtSize(addr, 12);
    coverPage.drawText(addr, {
      x: (pageWidth - addrWidth) / 2,
      y,
      size: 12,
      font,
      color: darkGray,
    });
    y -= 24;
  }

  // Closure type
  const closureType = closureTypeLabel(project.closure_type);
  const ctText = `Closure Type: ${closureType}`;
  const ctWidth = font.widthOfTextAtSize(ctText, 12);
  coverPage.drawText(ctText, {
    x: (pageWidth - ctWidth) / 2,
    y,
    size: 12,
    font,
    color: darkGray,
  });
  y -= 24;

  // CUPA
  const cupaText = `CUPA: ${jurisdiction.cupa_name}`;
  const cupaWidth = font.widthOfTextAtSize(cupaText, 12);
  coverPage.drawText(cupaText, {
    x: (pageWidth - cupaWidth) / 2,
    y,
    size: 12,
    font,
    color: darkGray,
  });
  y -= 24;

  // File/Permit numbers
  if (project.facility_file_number) {
    const fileText = `File No.: ${project.facility_file_number}`;
    const fileWidth = font.widthOfTextAtSize(fileText, 12);
    coverPage.drawText(fileText, {
      x: (pageWidth - fileWidth) / 2,
      y,
      size: 12,
      font,
      color: darkGray,
    });
    y -= 24;
  }
  if (project.closure_permit_number) {
    const permitText = `Permit No.: ${project.closure_permit_number}`;
    const permitWidth = font.widthOfTextAtSize(permitText, 12);
    coverPage.drawText(permitText, {
      x: (pageWidth - permitWidth) / 2,
      y,
      size: 12,
      font,
      color: darkGray,
    });
    y -= 24;
  }

  // Date
  y -= 20;
  const dateText = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const dateWidth = font.widthOfTextAtSize(dateText, 12);
  coverPage.drawText(dateText, {
    x: (pageWidth - dateWidth) / 2,
    y,
    size: 12,
    font,
    color: lightGray,
  });

  // Footer
  const footerText = "Prepared with ClosurePack";
  const footerWidth = font.widthOfTextAtSize(footerText, 9);
  coverPage.drawText(footerText, {
    x: (pageWidth - footerWidth) / 2,
    y: margin,
    size: 9,
    font,
    color: lightGray,
  });

  // ===== PAGE 2: Table of Contents =====
  const tocPage = pdfDoc.addPage([pageWidth, pageHeight]);
  y = pageHeight - margin;

  // TOC Title
  const tocTitle = "Table of Contents";
  const tocTitleSize = 22;
  const tocTitleWidth = fontBold.widthOfTextAtSize(tocTitle, tocTitleSize);
  tocPage.drawText(tocTitle, {
    x: (pageWidth - tocTitleWidth) / 2,
    y,
    size: tocTitleSize,
    font: fontBold,
    color: black,
  });
  y -= 8;

  tocPage.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
    color: rgb(0.2, 0.4, 0.6),
  });
  y -= 36;

  // TOC entries — matches ZIP export structure from CLAUDE.md
  const tocEntries = [
    { num: "00", title: "Cover Sheet" },
    { num: "01", title: "Table of Contents" },
    { num: "02", title: "Closure Letter (DRAFT)" },
    { num: "03", title: "Photo Log" },
    { num: "04", title: "Site Plan" },
    { num: "05", title: "Laboratory Analytical Results" },
    { num: "06", title: "Chain of Custody Documentation" },
    { num: "07", title: "Hazardous Waste Manifests" },
    { num: "08", title: "Tank Disposal Documentation" },
    { num: "09", title: "Boring Logs / Well Diagrams" },
    { num: "10", title: "Additional Documents" },
    { num: "11", title: "Submission Checklist" },
  ];

  const entrySize = 12;
  const lineH = 28;

  for (const entry of tocEntries) {
    const numText = `${entry.num}.`;
    tocPage.drawText(numText, {
      x: margin,
      y,
      size: entrySize,
      font: fontBold,
      color: darkGray,
    });

    tocPage.drawText(entry.title, {
      x: margin + 40,
      y,
      size: entrySize,
      font,
      color: black,
    });

    // Dotted leader line (simplified)
    const titleEnd =
      margin + 40 + font.widthOfTextAtSize(entry.title, entrySize) + 8;
    const dotsEnd = pageWidth - margin - 30;
    if (titleEnd < dotsEnd) {
      const dots = ".".repeat(
        Math.floor((dotsEnd - titleEnd) / font.widthOfTextAtSize(".", entrySize))
      );
      tocPage.drawText(dots, {
        x: titleEnd,
        y,
        size: entrySize,
        font,
        color: lightGray,
      });
    }

    y -= lineH;
  }

  // --- Add DRAFT watermark to all pages ---
  const watermarkFont = fontBold;
  const watermarkText = "DRAFT — FOR CUPA USE";
  const watermarkSize = 48;

  for (const p of pdfDoc.getPages()) {
    const { width, height } = p.getSize();
    const textWidth = watermarkFont.widthOfTextAtSize(
      watermarkText,
      watermarkSize
    );
    p.drawText(watermarkText, {
      x: width / 2 - textWidth / 2 + 30,
      y: height / 2 - 20,
      size: watermarkSize,
      font: watermarkFont,
      color: rgb(0.9, 0.9, 0.9),
      rotate: degrees(45),
      opacity: 0.3,
    });
  }

  return pdfDoc.save();
}
