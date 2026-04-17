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
  CERTIFICATE_ASSETS_DIRECTORY,
  formatItalianDate,
  getCertificateHeadingText,
  getCertificateTitle,
  type CertificateDeliveryRequest,
} from "@/lib/certificates/content";

const A4_PAGE_SIZE: [number, number] = [595.28, 841.89];
const PUBLIC_CERTIFICATE_ASSETS_PATH = "/certificate-assets";

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
  const readFailures: unknown[] = [];

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
    } catch (error) {
      // Prima scelta: filesystem locale (utile in sviluppo).
      readFailures.push(error);
    }
  }

  // Fallback robusto per runtime serverless: carica gli asset via URL pubblico.
  const baseUrl = getRuntimeBaseUrl();

  if (!baseUrl) {
    return null;
  }

  for (const candidate of candidateNames) {
    const assetUrl = `${baseUrl}${PUBLIC_CERTIFICATE_ASSETS_PATH}/${candidate}`;

    try {
      const response = await fetch(assetUrl, {
        cache: "no-store",
      });

      if (!response.ok) {
        continue;
      }

      const bytes = new Uint8Array(await response.arrayBuffer());

      return {
        bytes,
        extension: path.extname(candidate).toLowerCase(),
      };
    } catch (error) {
      readFailures.push(error);
    }
  }

  return null;
}

function getRuntimeBaseUrl() {
  const explicit =
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL;

  if (explicit && explicit.trim() !== "") {
    return explicit.trim().replace(/\/+$/, "");
  }

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (productionHost && productionHost.trim() !== "") {
    return `https://${productionHost.trim()}`;
  }

  const deploymentHost = process.env.VERCEL_URL;

  if (deploymentHost && deploymentHost.trim() !== "") {
    return `https://${deploymentHost.trim()}`;
  }

  return "http://127.0.0.1:3000";
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

  const signatureBaseY = signatureTopY - 12;
  const signatureX = marginX + 40;

  if (signatureImage) {
    const dimensions = signatureImage.scaleToFit(170, 78);
    page.drawImage(signatureImage, {
      x: signatureX,
      y: signatureBaseY + 8,
      width: dimensions.width,
      height: dimensions.height,
    });
  }

  page.drawLine({
    start: { x: signatureX, y: signatureBaseY + 4 },
    end: { x: signatureX + 190, y: signatureBaseY + 4 },
    thickness: 1,
    color: rgb(0.54, 0.54, 0.54),
  });

  page.drawText("Prof. Stefano Orlando", {
    x: signatureX,
    y: signatureBaseY - 14,
    size: 13,
    font: bodyBoldFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText("Coordinatore attività giovanili", {
    x: signatureX,
    y: signatureBaseY - 34,
    size: 12,
    font: bodyFont,
    color: rgb(0.36, 0.36, 0.36),
  });

  page.drawText("Tel. 328/5699419", {
    x: signatureX,
    y: signatureBaseY - 53,
    size: 11,
    font: bodyFont,
    color: rgb(0.36, 0.36, 0.36),
  });

  page.drawText("Email: info@giovaniperlapace.it", {
    x: signatureX,
    y: signatureBaseY - 70,
    size: 11,
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
      y: 22,
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
