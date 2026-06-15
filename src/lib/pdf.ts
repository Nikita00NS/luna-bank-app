/**
 * Luna Bank — PDF Document Generator
 * v1.2
 *
 * Generates professional banking documents:
 * 1. Contract (Договор) — 2 pages with electronic signature
 * 2. Statement (Выписка) — Transaction history with totals
 * 3. Requisites (Реквизиты) — Account details for transfers
 * 4. Balance Certificate (Справка об остатке)
 * 5. Contract Certificate (Справка о договоре)
 *
 * Style: T-Bank inspired (black header, clean typography)
 * Note: jsPDF uses Helvetica which supports basic Latin.
 *       Cyrillic works via built-in encoding but may have
 *       rendering differences on some PDF viewers.
 */

import { jsPDF } from 'jspdf';
import type { Account, User, Transaction } from './store';
import { LNC_RATE_USD, SUBSCRIPTION_PLANS } from './constants';

// ===== Constants =====
const BANK_NAME = 'LUNA BANK';
const BANK_FULL = 'LUNA BANK LTD.';
const BANK_LICENSE = 'Luna Bank Ltd. | Digital Asset License | SWIFT: LUNABKXX';
const MARGIN = 15;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// ===== Helpers =====

function genDocId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-8)}`;
}

function formatDate(): string {
  return new Date().toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateLong(): string {
  return new Date().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Draw the standard Luna Bank header
 * Black bar with gold "LUNA BANK" text
 */
function drawHeader(doc: jsPDF, docType: string, docId: string): number {
  // Black header bar
  doc.setFillColor(10, 10, 15);
  doc.rect(0, 0, PAGE_WIDTH, 30, 'F');

  // Gold accent line
  doc.setFillColor(255, 195, 0);
  doc.rect(0, 29.5, PAGE_WIDTH, 0.5, 'F');

  // Bank name — gold
  doc.setTextColor(255, 195, 0);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(BANK_NAME, MARGIN, 15);

  // Subtitle
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.setFont('helvetica', 'normal');
  doc.text('DIGITAL FINANCIAL ECOSYSTEM', MARGIN, 21);
  doc.text('LUNA-BANK-APP.VERCEL.APP', MARGIN, 26);

  // Right side — doc info
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(8);
  doc.text(docType, PAGE_WIDTH - MARGIN, 12, { align: 'right' });
  doc.text(`No ${docId}`, PAGE_WIDTH - MARGIN, 18, { align: 'right' });
  doc.text(formatDate(), PAGE_WIDTH - MARGIN, 24, { align: 'right' });

  // Reset
  doc.setTextColor(0, 0, 0);

  return 36; // Y position after header
}

/**
 * Draw the standard Luna Bank footer
 */
function drawFooter(doc: jsPDF, page: number, totalPages: number): void {
  const y = 282;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y - 2, PAGE_WIDTH - MARGIN, y - 2);

  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  doc.text(BANK_LICENSE, MARGIN, y);
  doc.text(`${page}/${totalPages}`, PAGE_WIDTH - MARGIN, y, { align: 'right' });
  doc.setTextColor(0, 0, 0);
}

/**
 * Wrap text to fit within maxWidth, returns new Y position
 */
function writeWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const lines: string[] = doc.splitTextToSize(text, maxWidth);
  lines.forEach((line: string, i: number) => {
    doc.text(line, x, y + i * lineHeight);
  });
  return y + lines.length * lineHeight;
}

/**
 * Draw a section title with gray background
 */
function drawSection(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(242, 242, 247);
  doc.roundedRect(MARGIN, y - 4, CONTENT_WIDTH, 8, 1, 1, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 40);
  doc.text(title, MARGIN + 3, y + 1);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 60);
  return y + 10;
}

/**
 * Draw a key-value row
 */
function drawRow(
  doc: jsPDF,
  label: string,
  value: string,
  y: number,
  labelX: number = MARGIN,
  valueX: number = 65
): number {
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 110);
  doc.text(label, labelX, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 30);
  doc.text(value, valueX, y);
  return y + 5.5;
}

/**
 * Add signature block
 */
function drawSignatureBlock(doc: jsPDF, y: number): number {
  doc.setTextColor(50, 50, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('S uvazheniem,', MARGIN, y);
  y += 5;
  doc.text('Rukovoditel Operacionnogo upravleniya', MARGIN, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Luna Bank Digital Operations', MARGIN, y);
  return y + 5;
}

// ==========================================
// 1. CONTRACT — Dogovor bankovskogo obsluzhivaniya
// ==========================================

export function generateContract(
  user: User,
  account: Account,
  signerName: string,
  signatureDataUrl: string | null
): void {
  const doc = new jsPDF();
  const docId = genDocId('CNT');

  // ===== PAGE 1 =====
  let y = drawHeader(doc, 'DOGOVOR', docId);

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 30);
  doc.text('DOGOVOR BANKOVSKOGO OBSLUZHIVANIYA', PAGE_WIDTH / 2, y, {
    align: 'center',
  });
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 110);
  doc.text(`No ${docId}`, PAGE_WIDTH / 2, y, { align: 'center' });
  y += 10;

  // Intro
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 60);
  y = writeWrapped(
    doc,
    `${BANK_FULL}, deystvuyushchiy na osnovanii licenzii (dalee - "Bank"), i ${signerName} (dalee - "Klient"), zaklyuchili nastoyashchiy Dogovor o nizhessleduyushchem:`,
    MARGIN,
    y,
    CONTENT_WIDTH,
    4.5
  );
  y += 6;

  // Section 1 — Subject
  y = drawSection(doc, '1. PREDMET DOGOVORA', y);
  doc.setFontSize(9);
  const s1 = [
    `1.1. Bank otkryvaet Klientu schyot "${account.name}" v valyute ${account.currency}.`,
    `1.2. Nomer schyota: ${account.account_number}`,
    `1.3. IBAN: ${account.iban}`,
    `1.4. Valyuta: ${account.currency}${account.currency === 'LNC' ? ` (1 LNC = $${LNC_RATE_USD})` : ''}`,
    `1.5. Schyot prednaznachen dlya khraneniya sredstv, perevodov, oplaty uslug.`,
  ];
  for (const line of s1) {
    y = writeWrapped(doc, line, MARGIN, y, CONTENT_WIDTH, 4.5);
    y += 2.5;
  }
  y += 3;

  // Section 2 — Bank obligations
  y = drawSection(doc, '2. OBYAZANNOSTI BANKA', y);
  for (const line of [
    '2.1. Zachislyat sredstva ne pozdnee 1 rabochego dnya.',
    '2.2. Vypolnyat rasporyazheniya Klienta.',
    '2.3. Obespechit sokhrannost sredstv.',
    '2.4. Predostavlyat vypiski po trebovaniyu.',
    '2.5. Uvedomlyat o vsekh operaciyakh.',
  ]) {
    y = writeWrapped(doc, line, MARGIN, y, CONTENT_WIDTH, 4.5);
    y += 2.5;
  }
  y += 3;

  // Section 3 — Client obligations
  y = drawSection(doc, '3. OBYAZANNOSTI KLIENTA', y);
  for (const line of [
    '3.1. Predostavit dostovernye personalnye dannye.',
    '3.2. Ne peredavat PIN-kod tretim licam.',
    '3.3. Uvedomlyat ob izmenenii dannykh.',
    '3.4. Ne ispolzovat schyot dlya nezakonnoy deyatelnosti.',
  ]) {
    y = writeWrapped(doc, line, MARGIN, y, CONTENT_WIDTH, 4.5);
    y += 2.5;
  }

  drawFooter(doc, 1, 2);

  // ===== PAGE 2 =====
  doc.addPage();
  y = drawHeader(doc, 'DOGOVOR', docId);

  // Section 4 — Tariffs
  y = drawSection(doc, '4. TARIFY I KOMISSII', y);
  doc.setFontSize(9);

  // Tariff table
  doc.setFillColor(245, 245, 248);
  doc.roundedRect(MARGIN, y - 2, CONTENT_WIDTH, 28, 1, 1, 'F');
  doc.setDrawColor(220, 220, 230);
  doc.roundedRect(MARGIN, y - 2, CONTENT_WIDTH, 28, 1, 1, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 90);
  doc.text('Usluga', MARGIN + 5, y + 3);
  doc.text('Free', 90, y + 3);
  doc.text('Plus ($4.99)', 120, y + 3);
  doc.text('Cosmic ($19.99)', 155, y + 3);

  doc.setDrawColor(210, 210, 220);
  doc.line(MARGIN + 3, y + 5, PAGE_WIDTH - MARGIN - 3, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 70);
  const tariffRows = [
    ['Komissiya', '0.5%', '0.3%', '0%'],
    ['Cashback', '0%', '1%', '3%'],
    ['Limit/den', '$1,000', '$10,000', 'Unlimited'],
    ['Podderzhka', 'Chat', 'Priority', 'VIP 24/7'],
  ];
  tariffRows.forEach((row, i) => {
    const ry = y + 10 + i * 5;
    doc.text(row[0], MARGIN + 5, ry);
    doc.text(row[1], 93, ry);
    doc.text(row[2], 128, ry);
    doc.text(row[3], 163, ry);
  });
  y += 34;

  for (const line of [
    '4.1. Obsluzhivanie schyota - besplatno.',
    `4.2. Kurs LNC: 1 Luna Coin = $${LNC_RATE_USD} (fiksirovannyy).`,
    '4.3. Karty: virtualnaya $0, premium $4.99, plastik $19.99.',
  ]) {
    y = writeWrapped(doc, line, MARGIN, y, CONTENT_WIDTH, 4.5);
    y += 2.5;
  }
  y += 3;

  // Section 5 — Responsibility
  y = drawSection(doc, '5. OTVETSTVENNOST STORON', y);
  for (const line of [
    '5.1. Bank ne otvechaet za nevernye rekvizity Klienta.',
    '5.2. Dannye zashchishcheny SHA-256 + TLS 1.3.',
    '5.3. Klient otvechaet za sokhrannost PIN-koda.',
  ]) {
    y = writeWrapped(doc, line, MARGIN, y, CONTENT_WIDTH, 4.5);
    y += 2.5;
  }
  y += 3;

  // Section 6 — Duration
  y = drawSection(doc, '6. SROK DEYSTVIYA', y);
  for (const line of [
    '6.1. Dogovor bessrochnyy s momenta elektronnoy podpisi.',
    '6.2. Rastorzhenie - uvedomlenie za 30 dney.',
  ]) {
    y = writeWrapped(doc, line, MARGIN, y, CONTENT_WIDTH, 4.5);
    y += 2.5;
  }
  y += 8;

  // Signatures block
  doc.setDrawColor(200, 200, 210);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 30);
  doc.text('PODPISI STORON', MARGIN, y);
  y += 8;

  // Bank signature
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 60);
  doc.text('Bank: ' + BANK_FULL, MARGIN, y);
  y += 5;
  doc.setTextColor(34, 139, 34);
  doc.text('Elektronnaya podpis podtverzhdena', MARGIN, y);
  y += 8;

  // Client signature
  doc.setTextColor(50, 50, 60);
  doc.text(`Klient: ${signerName}`, MARGIN, y);
  y += 5;
  doc.text(`Luna ID: ${user.luna_id} | @${user.username}`, MARGIN, y);
  y += 5;
  doc.text(`Data: ${formatDateLong()}`, MARGIN, y);
  y += 5;
  doc.text('Elektronnaya podpis:', MARGIN, y);
  y += 3;

  // Insert signature image
  if (signatureDataUrl) {
    try {
      doc.addImage(signatureDataUrl, 'PNG', MARGIN, y, 60, 22);
    } catch (err) {
      console.warn('[PDF] Signature image failed:', err);
      doc.text('[Podpis prilozhena]', MARGIN, y + 5);
    }
  }

  drawFooter(doc, 2, 2);

  doc.save(`Luna_Bank_Contract_${docId}.pdf`);
}

// ==========================================
// 2. STATEMENT — Spravka o dvizhenii sredstv
// ==========================================

export function generateStatement(
  user: User,
  account: Account,
  transactions: Transaction[]
): void {
  const doc = new jsPDF();
  const docId = genDocId('STM');
  let y = drawHeader(doc, 'VYPISKA', docId);

  // Title
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 30);
  doc.text('Spravka o dvizhenii sredstv', MARGIN, y);
  y += 6;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 6;

  // Client + Account info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${user.first_name} ${user.last_name}`, MARGIN, y);
  y += 8;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  y = drawRow(doc, 'Dogovor:', user.luna_id, y, MARGIN, 55);
  y = drawRow(doc, 'Schyot:', account.account_number, y, MARGIN, 55);
  y = drawRow(doc, 'Valyuta:', account.currency, y, MARGIN, 55);
  y += 4;

  // Table header
  doc.setFillColor(235, 235, 242);
  doc.rect(MARGIN, y - 3, CONTENT_WIDTH, 7, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 70);
  doc.text('Data', MARGIN + 2, y + 1);
  doc.text('Summa', 55, y + 1);
  doc.text('Opisanie', 95, y + 1);
  doc.text('Status', PAGE_WIDTH - MARGIN - 10, y + 1);
  y += 8;

  // Transactions
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  let totalIn = 0;
  let totalOut = 0;

  const txList = transactions.slice(0, 25);

  txList.forEach((tx, i) => {
    // Check page overflow
    if (y > 270) {
      drawFooter(doc, 1, 2);
      doc.addPage();
      y = drawHeader(doc, 'VYPISKA', docId);
    }

    const isOut = tx.from_user_id === user.telegram_id;
    if (isOut) totalOut += tx.amount;
    else totalIn += tx.amount;

    // Alternating row background
    if (i % 2 === 0) {
      doc.setFillColor(248, 248, 252);
      doc.rect(MARGIN, y - 3, CONTENT_WIDTH, 6, 'F');
    }

    // Date
    doc.setTextColor(60, 60, 70);
    const dateStr = tx.created_at
      ? new Date(tx.created_at).toLocaleDateString('ru-RU')
      : '-';
    doc.text(dateStr, MARGIN + 2, y);

    // Amount (colored)
    if (isOut) {
      doc.setTextColor(200, 0, 0);
    } else {
      doc.setTextColor(0, 130, 0);
    }
    doc.setFont('helvetica', 'bold');
    doc.text(`${isOut ? '-' : '+'}${tx.amount.toFixed(2)}`, 55, y);

    // Description
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 50);
    const desc = (tx.note || tx.type || '').slice(0, 35);
    doc.text(desc, 95, y);

    // Status
    doc.setTextColor(0, 130, 0);
    doc.text(tx.status === 'completed' ? 'OK' : tx.status, PAGE_WIDTH - MARGIN - 8, y);

    y += 6;
  });

  // Summary
  y += 4;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  doc.setTextColor(0, 130, 0);
  doc.text('Postupleniya:', MARGIN, y);
  doc.text(`+${totalIn.toFixed(2)} ${account.currency}`, PAGE_WIDTH - MARGIN, y, {
    align: 'right',
  });
  y += 5;

  doc.setTextColor(200, 0, 0);
  doc.text('Raskhody:', MARGIN, y);
  doc.text(`-${totalOut.toFixed(2)} ${account.currency}`, PAGE_WIDTH - MARGIN, y, {
    align: 'right',
  });
  y += 5;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text('Balans:', MARGIN, y);
  doc.text(
    `${account.balance.toFixed(2)} ${account.currency}`,
    PAGE_WIDTH - MARGIN,
    y,
    { align: 'right' }
  );

  drawFooter(doc, 1, 1);
  doc.save(`Luna_Bank_Statement_${docId}.pdf`);
}

// ==========================================
// 3. REQUISITES — Spravka s rekvizitami
// ==========================================

export function generateRequisites(user: User, account: Account): void {
  const doc = new jsPDF();
  const docId = genDocId('REQ');
  let y = drawHeader(doc, 'REKVIZITY', docId);

  // Title
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 30);
  doc.text('Spravka s rekvizitami schyota', MARGIN, y);
  y += 6;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 8;

  // Client name
  doc.setFontSize(10);
  doc.text(`${user.first_name} ${user.last_name}`, MARGIN, y);
  y += 10;

  // Body text
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 60);
  y = writeWrapped(
    doc,
    `${BANK_FULL} soobshchaet, chto mezhdu Vami i Bankom zaklyuchyon Dogovor obsluzhivaniya No ${user.luna_id}. V ramkakh Dogovora otkryt schyot No ${account.account_number}.`,
    MARGIN,
    y,
    CONTENT_WIDTH,
    4.5
  );
  y += 8;

  // Requisites
  doc.setFont('helvetica', 'bold');
  doc.text('Rekvizity:', MARGIN, y);
  y += 7;

  const requisites: [string, string][] = [
    ['Bank:', BANK_FULL],
    ['SWIFT/BIC:', 'LUNABKXX'],
    ['Schyot:', account.account_number],
    ['IBAN:', account.iban],
    [
      'Valyuta:',
      `${account.currency}${account.currency === 'LNC' ? ` (1 LNC = $${LNC_RATE_USD})` : ''}`,
    ],
    ['Poluchatel:', `${user.first_name} ${user.last_name}`],
    ['Luna ID:', user.luna_id],
    ['Telegram:', `@${user.username}`],
  ];

  doc.setFontSize(9);
  for (const [label, value] of requisites) {
    y = drawRow(doc, label, value, y, MARGIN, 60);
  }

  y += 15;
  y = drawSignatureBlock(doc, y);

  drawFooter(doc, 1, 1);
  doc.save(`Luna_Bank_Requisites_${docId}.pdf`);
}

// ==========================================
// 4. BALANCE CERTIFICATE
// ==========================================

export function generateBalanceCertificate(user: User, account: Account): void {
  const doc = new jsPDF();
  const docId = genDocId('BAL');
  let y = drawHeader(doc, 'SPRAVKA', docId);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 30);
  doc.text('Spravka o dostupnom ostatke', MARGIN, y);
  y += 6;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 8;

  doc.setFontSize(10);
  doc.text(`${user.first_name} ${user.last_name}`, MARGIN, y);
  y += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 60);
  y = writeWrapped(
    doc,
    `${BANK_FULL} soobshchaet, chto po sostoyaniyu na ${formatDateLong()} summa dostupnykh sredstv na schyote No ${account.account_number} sostavlyaet:`,
    MARGIN,
    y,
    CONTENT_WIDTH,
    4.5
  );
  y += 8;

  // Big balance
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`${account.balance.toFixed(2)} ${account.currency}`, MARGIN, y);
  y += 7;

  if (account.currency === 'LNC') {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Ekvivalent: $${(account.balance * LNC_RATE_USD).toFixed(2)} USD`,
      MARGIN,
      y
    );
    y += 5;
  }

  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 60);
  doc.text(
    `Derzhatel schyota: ${user.first_name} ${user.last_name}`,
    MARGIN,
    y
  );
  y += 5;
  doc.text(`Luna ID: ${user.luna_id} | @${user.username}`, MARGIN, y);

  y += 15;
  y = drawSignatureBlock(doc, y);

  drawFooter(doc, 1, 1);
  doc.save(`Luna_Bank_Balance_${docId}.pdf`);
}

// ==========================================
// 5. CONTRACT CERTIFICATE
// ==========================================

export function generateContractCertificate(
  user: User,
  account: Account
): void {
  const doc = new jsPDF();
  const docId = genDocId('CRT');
  let y = drawHeader(doc, 'SPRAVKA', docId);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 30);
  doc.text('Spravka o zaklyuchenii dogovora', MARGIN, y);
  y += 6;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 8;

  doc.setFontSize(10);
  doc.text(`${user.first_name} ${user.last_name}`, MARGIN, y);
  y += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 60);

  const openDate = new Date(account.created_at).toLocaleDateString('ru-RU');

  y = writeWrapped(
    doc,
    `${BANK_FULL} soobshchaet, chto mezhdu Vami i Bankom ${openDate} zaklyuchyon Dogovor obsluzhivaniya No ${user.luna_id}.`,
    MARGIN,
    y,
    CONTENT_WIDTH,
    4.5
  );
  y += 5;

  y = writeWrapped(
    doc,
    `V ramkakh Dogovora otkryt schyot No ${account.account_number} v valyute ${account.currency}.`,
    MARGIN,
    y,
    CONTENT_WIDTH,
    4.5
  );
  y += 5;

  y = writeWrapped(
    doc,
    `Po sostoyaniyu na ${formatDateLong()} summa sredstv na Dogovore sostavlyaet ${account.balance.toFixed(2)} ${account.currency}${
      account.currency === 'LNC'
        ? ` (ekvivalent $${(account.balance * LNC_RATE_USD).toFixed(2)} USD)`
        : ''
    }.`,
    MARGIN,
    y,
    CONTENT_WIDTH,
    4.5
  );
  y += 5;

  // Subscription info
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === user.subscription);
  if (plan) {
    y = writeWrapped(
      doc,
      `Podpiska: ${plan.name} ($${plan.price}/mes, komissiya ${plan.commission}%, cashback ${plan.cashback}%).`,
      MARGIN,
      y,
      CONTENT_WIDTH,
      4.5
    );
  }

  y += 15;
  y = drawSignatureBlock(doc, y);

  drawFooter(doc, 1, 1);
  doc.save(`Luna_Bank_ContractInfo_${docId}.pdf`);
}
