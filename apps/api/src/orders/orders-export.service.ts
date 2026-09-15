import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { AdminOrder } from "./orders.service";

interface OrderRow {
  orderNumber: string;
  date: string;
  status: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  vendors: string;
  items: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
  provider: string;
  paymentStatus: string;
  address: string;
}

function toRow(order: AdminOrder): OrderRow {
  const items = order.vendorOrders.flatMap((vo) => vo.items);
  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  // Most recent payment attempt — payments is already ordered newest-first
  // (see ADMIN_ORDER_INCLUDE), so [0] is the one that actually decided the
  // order's current status, not necessarily the first attempt.
  const latestPayment = order.payments[0];

  return {
    orderNumber: order.id.slice(0, 8).toUpperCase(),
    date: order.createdAt.toISOString().slice(0, 16).replace("T", " "),
    status: order.status,
    buyerName: `${order.buyer.firstName} ${order.buyer.lastName}`,
    buyerEmail: order.buyer.email,
    buyerPhone: order.buyer.phone ?? "",
    vendors: order.vendorOrders.map((vo) => `${vo.vendor.businessName} (${vo.status})`).join("; "),
    items: items.map((item) => `${item.quantity}x ${item.title}`).join("; "),
    subtotal,
    deliveryFee: Number(order.deliveryFee),
    total: Number(order.totalAmount),
    currency: order.currency,
    provider: order.paymentProvider ?? "",
    paymentStatus: latestPayment?.status ?? "",
    address: order.address
      ? `${order.address.line1}, ${order.address.city}, ${order.address.state}`
      : "",
  };
}

const COLUMNS: { header: string; key: keyof OrderRow; width: number }[] = [
  { header: "Order #", key: "orderNumber", width: 12 },
  { header: "Date", key: "date", width: 18 },
  { header: "Status", key: "status", width: 14 },
  { header: "Buyer name", key: "buyerName", width: 22 },
  { header: "Buyer email", key: "buyerEmail", width: 26 },
  { header: "Buyer phone", key: "buyerPhone", width: 16 },
  { header: "Vendors (status)", key: "vendors", width: 34 },
  { header: "Items", key: "items", width: 40 },
  { header: "Subtotal", key: "subtotal", width: 12 },
  { header: "Delivery fee", key: "deliveryFee", width: 12 },
  { header: "Total", key: "total", width: 12 },
  { header: "Currency", key: "currency", width: 10 },
  { header: "Payment provider", key: "provider", width: 16 },
  { header: "Payment status", key: "paymentStatus", width: 14 },
  { header: "Delivery address", key: "address", width: 40 },
];

@Injectable()
export class OrdersExportService {
  async toExcel(orders: AdminOrder[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Orders");
    sheet.columns = COLUMNS;
    sheet.getRow(1).font = { bold: true };

    for (const order of orders) {
      sheet.addRow(toRow(order));
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // Landscape, small-but-legible table — this is a bulk export for
  // spreadsheet-style skimming/filing, not a per-order receipt (that's
  // PaymentsService.notifyOrderConfirmed's job), so it deliberately
  // condenses each order to one row rather than one page.
  toPdf(orders: AdminOrder[]): Promise<Buffer> {
    // A landscape row for every order, condensed to fit — this is a bulk
    // export for filing/skimming, not a per-order receipt (that's
    // PaymentsService.notifyOrderConfirmed's job).
    const PDF_COLUMNS: { header: string; key: keyof OrderRow; width: number }[] = [
      { header: "Order #", key: "orderNumber", width: 55 },
      { header: "Date", key: "date", width: 75 },
      { header: "Status", key: "status", width: 55 },
      { header: "Buyer", key: "buyerName", width: 90 },
      { header: "Vendors", key: "vendors", width: 140 },
      { header: "Subtotal", key: "subtotal", width: 55 },
      { header: "Delivery", key: "deliveryFee", width: 50 },
      { header: "Total", key: "total", width: 60 },
      { header: "Payment", key: "provider", width: 60 },
    ];

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(16).text("Ikaystores — Transactions", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(8);

      const startX = 30;
      const colX: number[] = [];
      let cursor = startX;
      for (const col of PDF_COLUMNS) {
        colX.push(cursor);
        cursor += col.width;
      }

      const drawHeader = () => {
        const y = doc.y;
        doc.font("Helvetica-Bold");
        PDF_COLUMNS.forEach((col, i) => {
          doc.text(col.header, colX[i], y, { width: col.width - 4 });
        });
        doc.font("Helvetica");
        doc.moveDown(0.4);
        doc.moveTo(startX, doc.y).lineTo(cursor, doc.y).stroke();
        doc.moveDown(0.2);
      };

      drawHeader();

      for (const order of orders) {
        if (doc.y > 520) {
          doc.addPage();
          drawHeader();
        }
        const row = toRow(order);
        const y = doc.y;
        const values: Record<keyof OrderRow, string> = {
          ...row,
          subtotal: row.subtotal.toLocaleString(),
          deliveryFee: row.deliveryFee.toLocaleString(),
          total: `${row.currency} ${row.total.toLocaleString()}`,
        } as unknown as Record<keyof OrderRow, string>;
        PDF_COLUMNS.forEach((col, i) => {
          doc.text(String(values[col.key]), colX[i], y, { width: col.width - 4 });
        });
        doc.moveDown(0.6);
      }

      doc.end();
    });
  }
}
