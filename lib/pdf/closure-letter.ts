import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import type { Project, Jurisdiction, UST } from "@/types";

/** Format a date string as "Month Day, Year" */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Return display text or a [MISSING: label] placeholder */
function field(
  value: string | null | undefined,
  label: string
): { text: string; missing: boolean } {
  if (value && value.trim()) return { text: value.trim(), missing: false };
  return { text: `[MISSING: ${label}]`, missing: true };
}

/** Format closure type for display */
function closureTypeLabel(type: string | null): string {
  if (type === "removal") return "Removal";
  if (type === "closure_in_place") return "Closure in Place";
  return "Unknown";
}

/**
 * Simple word-wrap: splits text into lines that fit within maxWidth.
 */
function wrapText(
  textFont: { widthOfTextAtSize: (text: string, size: number) => number },
  text: string,
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const width = textFont.widthOfTextAtSize(test, size);
    if (width > maxWidth && current) {
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
 * Generate a Closure Letter PDF (DRAFT — FOR CUPA USE).
 * Uses the State Water Board-approved template format.
 */
export async function generateClosureLetter(
  project: Project,
  jurisdiction: Jurisdiction,
  tanks: UST[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const fontSize = 11;
  const lineHeight = 16;
  const margin = 72; // 1 inch
  const pageWidth = 612; // Letter size
  const pageHeight = 792;
  const contentWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const red = rgb(0.8, 0, 0);
  const black = rgb(0, 0, 0);

  // Helper: draw text with optional color
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
    const f = options.font ?? font;
    const s = options.size ?? fontSize;
    const c = options.color ?? black;
    page.drawText(text, { x, y: yPos, size: s, font: f, color: c });
  }

  // Draw a field value, highlighting missing fields in red
  function drawField(
    value: string | null | undefined,
    label: string,
    x: number,
    yPos: number,
    options: { font?: typeof font; size?: number } = {}
  ) {
    const f = field(value, label);
    drawText(f.text, x, yPos, {
      ...options,
      color: f.missing ? red : black,
    });
  }

  // Check if we need a new page
  function ensureSpace(needed: number) {
    if (y - needed < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  }

  // --- Letter Header ---
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  drawText(today, margin, y, { font: fontBold });
  y -= lineHeight * 2;

  // Owner/Operator Address Block
  drawField(project.owner_operator_name, "Owner/Operator Name", margin, y);
  y -= lineHeight;
  drawField(
    project.owner_operator_street,
    "Owner/Operator Street",
    margin,
    y
  );
  y -= lineHeight;

  const ownerCity = field(
    project.owner_operator_city,
    "Owner/Operator City"
  );
  const ownerState = field(
    project.owner_operator_state,
    "Owner/Operator State"
  );
  const ownerZip = field(project.owner_operator_zip, "Owner/Operator ZIP");
  const cityStateZip = `${ownerCity.text}, ${ownerState.text} ${ownerZip.text}`;
  const hasMissingAddr =
    ownerCity.missing || ownerState.missing || ownerZip.missing;
  drawText(cityStateZip, margin, y, {
    color: hasMissingAddr ? red : black,
  });
  y -= lineHeight * 2;

  // RE: line
  const facilityName = field(project.facility_name, "Facility Name");

  drawText("RE:", margin, y, { font: fontBold });
  const reText = `Underground Storage Tank Closure — ${facilityName.text}`;
  drawText(reText, margin + 30, y, {
    color: facilityName.missing ? red : black,
    font: fontBold,
  });
  y -= lineHeight;

  const facilityStreet = field(project.facility_street, "Facility Street");
  const facilityCity = field(project.facility_city, "Facility City");
  const facilityState = field(project.facility_state, "Facility State");
  const facilityZip = field(project.facility_zip, "Facility ZIP");
  const siteAddr = `${facilityStreet.text}, ${facilityCity.text}, ${facilityState.text} ${facilityZip.text}`;
  const siteAddrMissing =
    facilityStreet.missing ||
    facilityCity.missing ||
    facilityState.missing ||
    facilityZip.missing;
  drawText(siteAddr, margin + 30, y, {
    color: siteAddrMissing ? red : black,
  });

  if (project.facility_file_number) {
    y -= lineHeight;
    drawText(
      `File No.: ${project.facility_file_number}`,
      margin + 30,
      y
    );
  }
  if (project.closure_permit_number) {
    y -= lineHeight;
    drawText(
      `Permit No.: ${project.closure_permit_number}`,
      margin + 30,
      y
    );
  }

  y -= lineHeight * 2;

  // --- Salutation ---
  const cupaName = field(jurisdiction.cupa_name, "CUPA Name");
  drawText("Dear Sir or Madam:", margin, y, { font: fontBold });
  y -= lineHeight * 2;

  // --- Body Paragraph 1 ---
  const body1Lines = wrapText(
    font,
    `This letter serves as notification that underground storage tank (UST) closure activities have been completed at the above-referenced facility. The closure was conducted in accordance with applicable California Health and Safety Code requirements and local regulations administered by ${cupaName.text}.`,
    fontSize,
    contentWidth
  );
  for (const line of body1Lines) {
    ensureSpace(lineHeight);
    drawText(line, margin, y);
    y -= lineHeight;
  }
  y -= lineHeight;

  // --- Body Paragraph 2 ---
  const closureType = closureTypeLabel(project.closure_type);
  const body2Lines = wrapText(
    font,
    `The following underground storage tank(s) were closed by ${closureType.toLowerCase()} at the facility:`,
    fontSize,
    contentWidth
  );
  for (const line of body2Lines) {
    ensureSpace(lineHeight);
    drawText(line, margin, y);
    y -= lineHeight;
  }
  y -= lineHeight;

  // --- Tank Table ---
  if (tanks.length === 0) {
    ensureSpace(lineHeight);
    drawText("[MISSING: No tanks entered]", margin, y, { color: red });
    y -= lineHeight * 2;
  } else {
    const colWidths = [90, 150, 80, 100, 100];
    const headers = [
      "CERS Tank ID",
      "Contents",
      "Capacity",
      "Closure Date",
      "Type",
    ];

    ensureSpace(lineHeight * (tanks.length + 2));

    let x = margin;
    for (let i = 0; i < headers.length; i++) {
      drawText(headers[i], x, y, { font: fontBold, size: 10 });
      x += colWidths[i];
    }
    y -= 4;

    // Header underline
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 0.5,
      color: black,
    });
    y -= lineHeight;

    // Tank rows
    for (const tank of tanks) {
      ensureSpace(lineHeight);
      x = margin;
      drawText(tank.cers_tank_id || "—", x, y, { size: 10 });
      x += colWidths[0];
      drawText(tank.contents || "—", x, y, { size: 10 });
      x += colWidths[1];
      drawText(
        tank.capacity_gallons ? `${tank.capacity_gallons} gal` : "—",
        x,
        y,
        { size: 10 }
      );
      x += colWidths[2];
      drawText(
        tank.closure_date ? formatDate(tank.closure_date) : "—",
        x,
        y,
        { size: 10 }
      );
      x += colWidths[3];
      drawText(
        tank.closure_type ? closureTypeLabel(tank.closure_type) : "—",
        x,
        y,
        { size: 10 }
      );
      y -= lineHeight;
    }

    // Table bottom line
    page.drawLine({
      start: { x: margin, y: y + lineHeight - 4 },
      end: { x: pageWidth - margin, y: y + lineHeight - 4 },
      thickness: 0.5,
      color: black,
    });
    y -= lineHeight;
  }

  // --- Body Paragraph 3 ---
  const body3Lines = wrapText(
    font,
    `Soil samples were collected during closure activities and submitted to a California-certified laboratory for analysis. The analytical results and all supporting documentation are included in the attached closure report. This report is being submitted to ${cupaName.text} for review.`,
    fontSize,
    contentWidth
  );
  for (const line of body3Lines) {
    ensureSpace(lineHeight);
    drawText(line, margin, y);
    y -= lineHeight;
  }
  y -= lineHeight;

  // --- Closing paragraph ---
  const body4Lines = wrapText(
    font,
    `If you have any questions regarding this closure or require additional information, please do not hesitate to contact the undersigned.`,
    fontSize,
    contentWidth
  );
  for (const line of body4Lines) {
    ensureSpace(lineHeight);
    drawText(line, margin, y);
    y -= lineHeight;
  }
  y -= lineHeight * 2;

  // --- Signature block ---
  ensureSpace(lineHeight * 6);
  drawText("Sincerely,", margin, y);
  y -= lineHeight * 4;
  drawText("____________________________", margin, y);
  y -= lineHeight;
  drawText("Authorized Representative", margin, y, {
    font: fontItalic,
    size: 10,
  });
  y -= lineHeight * 2;

  // --- CUPA contact reference ---
  ensureSpace(lineHeight * 4);
  const contactName = field(
    jurisdiction.cupa_contact_name,
    "CUPA Contact Name"
  );
  const contactPhone = field(
    jurisdiction.cupa_contact_phone,
    "CUPA Contact Phone"
  );
  drawText("CUPA Contact:", margin, y, { font: fontBold, size: 10 });
  y -= lineHeight;
  drawText(contactName.text, margin, y, {
    size: 10,
    color: contactName.missing ? red : black,
  });
  y -= lineHeight;
  drawText(contactPhone.text, margin, y, {
    size: 10,
    color: contactPhone.missing ? red : black,
  });

  // --- Add DRAFT watermark to all pages ---
  const watermarkFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
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
