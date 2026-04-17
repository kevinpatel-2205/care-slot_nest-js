import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExcelService {
  async generate(
    res: Response,
    title: string,
    headers: string[],
    rows: (string | number)[][],
  ): Promise<void> {
    if (!rows || rows.length === 0) {
      throw new Error('No data found');
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(title);

    // ── Columns ────────────────────────────────────────────────────────────
    sheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: 22,
    }));

    // ── Rows ───────────────────────────────────────────────────────────────
    rows.forEach((row) => {
      const rowObj: Record<string, string | number> = {};
      headers.forEach((h, i) => (rowObj[h] = row[i] ?? ''));
      sheet.addRow(rowObj);
    });

    // ── Styling ────────────────────────────────────────────────────────────
    // Bold header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };

    // Borders + center-align every cell
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
    });

    // ── Stream ─────────────────────────────────────────────────────────────
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${title}.xlsx"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  async generateMultiSheet(
    res: Response,
    filename: string,
    sheets: { sheetName: string; headers: string[]; rows: (string | number)[][] }[],
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();

    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      },
    };

    const dataStyle: Partial<ExcelJS.Style> = {
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      },
    };

    for (const { sheetName, headers, rows } of sheets) {
      const sheet = workbook.addWorksheet(sheetName);

      sheet.columns = headers.map((h) => ({ header: h, key: h, width: 22 }));

      // Style header row
      sheet.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));

      // Add data rows
      rows.forEach((row) => {
        const rowObj: Record<string, string | number> = {};
        headers.forEach((h, i) => (rowObj[h] = row[i] ?? ''));
        const addedRow = sheet.addRow(rowObj);
        addedRow.eachCell((cell) => Object.assign(cell, dataStyle));
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }
}