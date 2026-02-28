import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import type { Project } from "@/types";
import type { PhotoWithUrl } from "@/lib/actions/photos";

/**
 * Generate a Photo Log PDF — 2 photos per page with captions, dates, and numbers.
 */
export async function generatePhotoLog(
  project: Project,
  photos: PhotoWithUrl[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 54;
  const contentWidth = pageWidth - margin * 2;
  const black = rgb(0, 0, 0);
  const darkGray = rgb(0.3, 0.3, 0.3);
  const lightGray = rgb(0.6, 0.6, 0.6);

  const facilityName = project.facility_name || "Untitled Facility";

  // If no photos, create a single page with a message
  if (photos.length === 0) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const msg = "No photos have been added to the photo log.";
    const msgWidth = font.widthOfTextAtSize(msg, 14);
    page.drawText(msg, {
      x: (pageWidth - msgWidth) / 2,
      y: pageHeight / 2,
      size: 14,
      font,
      color: darkGray,
    });
    return pdfDoc.save();
  }

  // Layout: 2 photos per page
  // Each photo section: image area + caption area
  const headerHeight = 50;
  const footerHeight = 40;
  const photoSectionHeight =
    (pageHeight - margin * 2 - headerHeight - footerHeight - 20) / 2;
  const imageMaxHeight = photoSectionHeight - 60; // Leave room for caption
  const imageMaxWidth = contentWidth;

  // Process photos in pairs
  for (let i = 0; i < photos.length; i += 2) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const pageNum = Math.floor(i / 2) + 1;
    const totalPages = Math.ceil(photos.length / 2);

    // --- Page Header ---
    let y = pageHeight - margin;
    page.drawText("Photo Log", {
      x: margin,
      y,
      size: 14,
      font: fontBold,
      color: black,
    });

    const headerRight = facilityName;
    const headerRightWidth = font.widthOfTextAtSize(headerRight, 10);
    page.drawText(headerRight, {
      x: pageWidth - margin - headerRightWidth,
      y: y + 2,
      size: 10,
      font,
      color: darkGray,
    });

    y -= 8;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: rgb(0.2, 0.4, 0.6),
    });
    y -= 20;

    // --- Render up to 2 photos on this page ---
    for (let slot = 0; slot < 2; slot++) {
      const photoIdx = i + slot;
      if (photoIdx >= photos.length) break;

      const photo = photos[photoIdx];
      const slotY = y - slot * photoSectionHeight;

      // Photo number label
      const photoLabel = `Photo ${photo.sort_order}`;
      page.drawText(photoLabel, {
        x: margin,
        y: slotY,
        size: 11,
        font: fontBold,
        color: black,
      });

      // Date (if available)
      if (photo.photo_date) {
        const dateStr = new Date(
          photo.photo_date + "T00:00:00"
        ).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
        const dateWidth = font.widthOfTextAtSize(dateStr, 10);
        page.drawText(dateStr, {
          x: pageWidth - margin - dateWidth,
          y: slotY,
          size: 10,
          font,
          color: darkGray,
        });
      }

      const imageY = slotY - 16;

      // Try to embed the photo image
      let embedded = false;
      if (photo.signedUrl) {
        try {
          const response = await fetch(photo.signedUrl);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const imageBytes = new Uint8Array(arrayBuffer);
            const contentType = response.headers.get("content-type") || "";

            // Try embedding as JPEG first, then PNG, then the other
            let image = null;
            if (contentType.includes("png")) {
              try {
                image = await pdfDoc.embedPng(imageBytes);
              } catch {
                try {
                  image = await pdfDoc.embedJpg(imageBytes);
                } catch {
                  image = null;
                }
              }
            } else {
              try {
                image = await pdfDoc.embedJpg(imageBytes);
              } catch {
                try {
                  image = await pdfDoc.embedPng(imageBytes);
                } catch {
                  image = null;
                }
              }
            }

            if (image) {
              // Scale image to fit within bounds
              const dims = image.scaleToFit(imageMaxWidth, imageMaxHeight);
              const imgX = margin + (imageMaxWidth - dims.width) / 2;
              const imgY = imageY - dims.height;

              page.drawImage(image, {
                x: imgX,
                y: imgY,
                width: dims.width,
                height: dims.height,
              });

              // Draw border around image
              page.drawRectangle({
                x: imgX,
                y: imgY,
                width: dims.width,
                height: dims.height,
                borderColor: rgb(0.8, 0.8, 0.8),
                borderWidth: 0.5,
                opacity: 0,
              });

              // Caption below image
              const captionY = imgY - 16;
              const caption = photo.caption || "(No caption)";
              page.drawText(caption, {
                x: margin,
                y: captionY,
                size: 10,
                font: photo.caption ? font : fontBold,
                color: photo.caption ? black : lightGray,
              });
              embedded = true;
            }
          }
        } catch (err) {
          console.error(
            `Failed to embed photo ${photo.sort_order}:`,
            err instanceof Error ? err.message : err
          );
        }
      }
      if (!embedded) {
        const msg = photo.signedUrl
          ? "[Image could not be loaded]"
          : "[No image URL available]";
        page.drawText(msg, {
          x: margin,
          y: imageY - 40,
          size: 10,
          font,
          color: lightGray,
        });
        // Still show caption
        const caption = photo.caption || "(No caption)";
        page.drawText(caption, {
          x: margin,
          y: imageY - 56,
          size: 10,
          font: photo.caption ? font : fontBold,
          color: photo.caption ? black : lightGray,
        });
      }
    }

    // --- Page Footer ---
    const footerText = `Page ${pageNum} of ${totalPages}`;
    const footerWidth = font.widthOfTextAtSize(footerText, 9);
    page.drawText(footerText, {
      x: (pageWidth - footerWidth) / 2,
      y: margin - 10,
      size: 9,
      font,
      color: lightGray,
    });
  }

  // --- Add watermark to all pages ---
  const watermarkFont = fontBold;
  const watermarkText = "DRAFT";
  const watermarkSize = 60;

  for (const p of pdfDoc.getPages()) {
    const { width, height } = p.getSize();
    const textWidth = watermarkFont.widthOfTextAtSize(
      watermarkText,
      watermarkSize
    );
    p.drawText(watermarkText, {
      x: width / 2 - textWidth / 2 + 20,
      y: height / 2 - 20,
      size: watermarkSize,
      font: watermarkFont,
      color: rgb(0.92, 0.92, 0.92),
      rotate: degrees(45),
      opacity: 0.25,
    });
  }

  return pdfDoc.save();
}
