import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PDFDocument,
  type PDFPage,
  StandardFonts,
  type PDFFont,
  rgb,
} from "pdf-lib";
import {
  buildCertificateBodyParagraphs,
  buildCertificateDetailRows,
  CERTIFICATE_ASSETS_DIRECTORY,
  formatItalianDate,
  getCertificateHeadingText,
  getCertificateTitle,
  type CertificateDeliveryRequest,
} from "@/lib/certificates/content";

const A4_PAGE_SIZE: [number, number] = [595.28, 841.89];

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
) {
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let currentLine = words[0] ?? "";

  for (const word of words.slice(1)) {
    const nextLine = `${currentLine} ${word}`;

    if (font.widthOfTextAtSize(nextLine, size) <= maxWidth) {
      currentLine = nextLine;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  lines.push(currentLine);
  return lines;
}

function drawWrappedTextBlock(params: {
  color?: ReturnType<typeof rgb>;
  font: PDFFont;
  lineHeight: number;
  maxWidth: number;
  page: PDFPage;
  size: number;
  text: string;
  x: number;
  y: number;
}) {
  const color = params.color ?? rgb(0.15, 0.15, 0.15);
  let currentY = params.y;
  const lines = wrapText(params.text, params.font, params.size, params.maxWidth);

  for (const line of lines) {
    params.page.drawText(line, {
      x: params.x,
      y: currentY,
      size: params.size,
      font: params.font,
      color,
    });
    currentY -= params.lineHeight;
  }

  return currentY;
}

function drawCenteredText(params: {
  color?: ReturnType<typeof rgb>;
  font: PDFFont;
  page: PDFPage;
  size: number;
  text: string;
  width: number;
  y: number;
}) {
  const color = params.color ?? rgb(0.1, 0.1, 0.1);
  const textWidth = params.font.widthOfTextAtSize(params.text, params.size);
  const x = (params.width - textWidth) / 2;

  params.page.drawText(params.text, {
    x,
    y: params.y,
    size: params.size,
    font: params.font,
    color,
  });
}

async function loadOptionalAsset(
  candidateNames: readonly string[],
) {
  for (const candidate of candidateNames) {
    const assetPath = path.join(
      /* turbopackIgnore: true */ process.cwd(),
      CERTIFICATE_ASSETS_DIRECTORY,
      candidate,
    );

    try {
      const bytes = await readFile(assetPath);
      return {
        bytes,
        extension: path.extname(candidate).toLowerCase(),
      };
    } catch {
      // Asset opzionale: se manca usiamo il fallback grafico.
    }
  }

  return null;
}

async function embedOptionalImage(
  pdfDoc: PDFDocument,
  candidateNames: readonly string[],
) {
  const asset = await loadOptionalAsset(candidateNames);

  if (!asset) {
    return null;
  }

  if (asset.extension === ".png") {
    return pdfDoc.embedPng(asset.bytes);
  }

  return pdfDoc.embedJpg(asset.bytes);
}

export async function buildCertificatePdf(
  request: CertificateDeliveryRequest,
) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage(A4_PAGE_SIZE);
  const { width, height } = page.getSize();
  const marginX = 56;
  const contentWidth = width - marginX * 2;
  const bodyFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const bodyBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const bodyItalicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const labelFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const labelValueFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const issuedAt = request.approved_at ? new Date(request.approved_at) : new Date();

  pdfDoc.setTitle(`${getCertificateTitle(request)} - ${request.student_last_name}`);
  pdfDoc.setAuthor("Giovani per la Pace");
  pdfDoc.setCreator("Certificati GXP");
  pdfDoc.setSubject(getCertificateTitle(request));
  pdfDoc.setLanguage("it-IT");

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(1, 1, 0.995),
  });

  let currentY = height - 72;
  const headerImage = await embedOptionalImage(pdfDoc, [
    "header.png",
    "header.jpg",
    "header.jpeg",
  ]);

  if (headerImage) {
    const dimensions = headerImage.scaleToFit(contentWidth, 92);
    page.drawImage(headerImage, {
      x: marginX,
      y: height - dimensions.height - 36,
      width: dimensions.width,
      height: dimensions.height,
    });
    currentY = height - dimensions.height - 62;
  } else {
    page.drawRectangle({
      x: marginX,
      y: height - 84,
      width: contentWidth,
      height: 1.2,
      color: rgb(0.71, 0.21, 0.23),
    });
    page.drawText("Giovani per la Pace", {
      x: marginX,
      y: height - 68,
      size: 22,
      font: bodyBoldFont,
      color: rgb(0.18, 0.18, 0.18),
    });
    page.drawText("Comunità di Sant'Egidio", {
      x: marginX,
      y: height - 90,
      size: 11,
      font: bodyItalicFont,
      color: rgb(0.42, 0.42, 0.42),
    });
    currentY = height - 134;
  }

  drawCenteredText({
    page,
    width,
    font: bodyBoldFont,
    size: 21,
    text: getCertificateTitle(request),
    y: currentY,
    color: rgb(0.12, 0.12, 0.12),
  });

  currentY -= 32;

  currentY = drawWrappedTextBlock({
    page,
    text: getCertificateHeadingText(request),
    x: marginX,
    y: currentY,
    maxWidth: contentWidth,
    font: bodyBoldFont,
    size: 13,
    lineHeight: 18,
    color: rgb(0.18, 0.18, 0.18),
  });

  currentY -= 28;

  for (const paragraph of buildCertificateBodyParagraphs(request)) {
    currentY = drawWrappedTextBlock({
      page,
      text: paragraph,
      x: marginX,
      y: currentY,
      maxWidth: contentWidth,
      font: bodyFont,
      size: 14,
      lineHeight: 20,
      color: rgb(0.16, 0.16, 0.16),
    });
    currentY -= 12;
  }

  const detailRows = buildCertificateDetailRows(request, issuedAt);
  const detailRowHeight = 18;
  const detailBoxHeight = 26 + detailRows.length * detailRowHeight;
  const detailBoxY = currentY - detailBoxHeight + 8;

  page.drawRectangle({
    x: marginX,
    y: detailBoxY,
    width: contentWidth,
    height: detailBoxHeight,
    color: rgb(0.97, 0.95, 0.92),
    borderColor: rgb(0.84, 0.78, 0.68),
    borderWidth: 1,
  });

  let detailY = detailBoxY + detailBoxHeight - 20;

  for (const [label, value] of detailRows) {
    page.drawText(`${label}:`, {
      x: marginX + 18,
      y: detailY,
      size: 10,
      font: labelFont,
      color: rgb(0.32, 0.28, 0.25),
    });
    page.drawText(value, {
      x: marginX + 132,
      y: detailY,
      size: 10,
      font: labelValueFont,
      color: rgb(0.22, 0.22, 0.22),
    });
    detailY -= detailRowHeight;
  }

  const signatureTopY = 172;
  const signatureImage = await embedOptionalImage(pdfDoc, [
    "signature.png",
    "signature.jpg",
    "signature.jpeg",
  ]);

  page.drawText(`Rilasciato a Roma, ${formatItalianDate(issuedAt)}`, {
    x: marginX,
    y: signatureTopY + 48,
    size: 12,
    font: bodyItalicFont,
    color: rgb(0.28, 0.28, 0.28),
  });

  if (signatureImage) {
    const dimensions = signatureImage.scaleToFit(150, 58);
    page.drawImage(signatureImage, {
      x: width - marginX - dimensions.width,
      y: signatureTopY + 22,
      width: dimensions.width,
      height: dimensions.height,
    });
  }

  page.drawLine({
    start: { x: width - marginX - 180, y: signatureTopY + 18 },
    end: { x: width - marginX, y: signatureTopY + 18 },
    thickness: 1,
    color: rgb(0.54, 0.54, 0.54),
  });

  page.drawText("Per Giovani per la Pace", {
    x: width - marginX - 178,
    y: signatureTopY,
    size: 11,
    font: bodyBoldFont,
    color: rgb(0.22, 0.22, 0.22),
  });

  page.drawText("Prof. Stefano Orlando", {
    x: width - marginX - 178,
    y: signatureTopY - 16,
    size: 10,
    font: bodyBoldFont,
    color: rgb(0.28, 0.28, 0.28),
  });

  page.drawText("Coordinatore attività giovanili", {
    x: width - marginX - 178,
    y: signatureTopY - 31,
    size: 10,
    font: bodyFont,
    color: rgb(0.36, 0.36, 0.36),
  });

  page.drawText("Tel. 328/5699419", {
    x: width - marginX - 178,
    y: signatureTopY - 46,
    size: 9,
    font: bodyFont,
    color: rgb(0.36, 0.36, 0.36),
  });

  page.drawText("Email: info@giovaniperlapace.it", {
    x: width - marginX - 178,
    y: signatureTopY - 60,
    size: 9,
    font: bodyFont,
    color: rgb(0.36, 0.36, 0.36),
  });

  const footerImage = await embedOptionalImage(pdfDoc, [
    "footer.png",
    "footer.jpg",
    "footer.jpeg",
  ]);

  if (footerImage) {
    const dimensions = footerImage.scaleToFit(contentWidth, 72);
    page.drawImage(footerImage, {
      x: marginX,
      y: 30,
      width: dimensions.width,
      height: dimensions.height,
    });
  } else {
    page.drawLine({
      start: { x: marginX, y: 70 },
      end: { x: width - marginX, y: 70 },
      thickness: 1,
      color: rgb(0.71, 0.21, 0.23),
    });
    page.drawText(
      "Giovani per la Pace · Certificato generato dal sistema Certificati GXP",
      {
        x: marginX,
        y: 50,
        size: 9,
        font: labelValueFont,
        color: rgb(0.42, 0.42, 0.42),
      },
    );
  }

  return pdfDoc.save();
}
