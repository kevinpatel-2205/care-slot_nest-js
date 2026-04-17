import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import PDFDocument from 'pdfkit';

@Injectable()
export class PdfService {
  generate(
    res: Response,
    title: string,
    headers: string[],
    rows: (string | number)[][],
  ): void {
    if (!rows || rows.length === 0) {
      throw new Error('No data found');
    }

    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${title}.pdf"`,
    );

    doc.pipe(res);

    // ── Layout constants ───────────────────────────────────────────────────
    const startX = 40;
    const pageWidth = 515;
    const bottomLimit = 760;
    const columnWidth = pageWidth / headers.length;

    let y = 100;

    // ── Helpers ────────────────────────────────────────────────────────────
    const checkPage = () => {
      if (y > bottomLimit) {
        doc.addPage();
        y = 60;
        drawHeader();
      }
    };

    const drawRow = (row: (string | number)[], isHeader = false) => {
      let x = startX;

      const heights = row.map((cell) =>
        doc.heightOfString(String(cell), {
          width: columnWidth - 8,
          align: 'center',
        }),
      );

      const maxHeight = Math.max(...heights) + 10;

      row.forEach((cell) => {
        doc.rect(x, y, columnWidth, maxHeight).stroke();

        doc
          .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(9)
          .text(String(cell), x + 4, y + 5, {
            width: columnWidth - 8,
            align: 'center',
          });

        x += columnWidth;
      });

      y += maxHeight;
    };

    const drawHeader = () => drawRow(headers, true);

    // ── Report heading ─────────────────────────────────────────────────────
    doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown(1);
    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`Generated: ${new Date().toLocaleDateString('en-IN')}`);

    y = doc.y + 20;

    // ── Table ──────────────────────────────────────────────────────────────
    drawHeader();

    rows.forEach((row) => {
      checkPage();
      drawRow(row);
    });

    doc.end();
  }

  generateMultiSection(
    res: Response,
    filename: string,
    sections: { title: string; headers: string[]; rows: (string | number)[][] }[],
  ): void {
    const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    doc.pipe(res);

    let isFirstSection = true;

    for (const section of sections) {
      if (!section.rows || section.rows.length === 0) continue;

      if (!isFirstSection) doc.addPage();
      isFirstSection = false;

      // Section title
      doc.fontSize(16).font('Helvetica-Bold').text(section.title, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString('en-IN')}`);
      doc.moveDown(0.5);

      const startX = 40;
      const pageWidth = doc.page.width - 80;
      const colWidth = pageWidth / section.headers.length;
      const bottomLimit = doc.page.height - 60;
      let y = doc.y + 10;

      const drawRow = (row: (string | number)[], isHeader = false) => {
        let x = startX;
        const heights = row.map((cell) =>
          doc.heightOfString(String(cell ?? '-'), { width: colWidth - 8 }),
        );
        const maxHeight = Math.max(...heights) + 10;

        row.forEach((cell) => {
          doc.rect(x, y, colWidth, maxHeight).stroke();
          doc
            .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(isHeader ? 9 : 8)
            .text(String(cell ?? '-'), x + 4, y + 5, {
              width: colWidth - 8,
              align: 'center',
            });
          x += colWidth;
        });
        y += maxHeight;
      };

      // Draw header
      drawRow(section.headers, true);

      // Draw data rows
      for (const row of section.rows) {
        const heights = row.map((cell) =>
          doc.heightOfString(String(cell ?? '-'), { width: colWidth - 8 }),
        );
        const rowH = Math.max(...heights) + 10;

        if (y + rowH > bottomLimit) {
          doc.addPage();
          y = 40;
          drawRow(section.headers, true); // repeat header on new page
        }

        drawRow(row);
      }
    }

    doc.end();
  }
}