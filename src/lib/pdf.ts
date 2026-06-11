import { jsPDF } from 'jspdf';
import type { Account, User } from './store';
import { LNC_RATE_USD } from './constants';

// Logo as inline data (will be used in browser where canvas is available)
const BANK_NAME = 'LUNA BANK';
const BANK_FULL = 'LUNA BANK LTD.';
const BANK_LICENSE = 'Luna Bank Ltd. | Digital Asset License | SWIFT: LUNABKXX';

function drawHeader(doc: jsPDF, refNum?: string) {
  // Black header bar
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, 210, 32, 'F');
  
  // Try to add logo image from DOM
  try {
    const img = document.querySelector('img[alt="Luna Bank"]') as HTMLImageElement;
    if (img && img.complete) {
      doc.addImage(img, 'PNG', 12, 4, 24, 24);
    }
  } catch {}

  // Gold text
  doc.setTextColor(255, 195, 0);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(BANK_NAME, 40, 16);

  // Subtitle
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.setFont('helvetica', 'normal');
  doc.text('DIGITAL FINANCIAL ECOSYSTEM', 40, 22);
  doc.text('LUNA-BANK-APP.VERCEL.APP', 40, 27);

  // Right side
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(8);
  if (refNum) doc.text('No ' + refNum, 195, 18, { align: 'right' });
  doc.text(new Date().toLocaleDateString('ru-RU'), 195, 24, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  return 38;
}

function drawFooter(doc: jsPDF, page: number, total: number) {
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(15, 280, 195, 280);
  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  doc.text(BANK_LICENSE, 15, 284);
  doc.text(`${page}/${total}`, 195, 284, { align: 'right' });
  doc.setTextColor(0, 0, 0);
}

function wt(doc: jsPDF, text: string, x: number, y: number, maxW: number, lh: number): number {
  const lines = doc.splitTextToSize(text, maxW);
  lines.forEach((line: string, i: number) => doc.text(line, x, y + i * lh));
  return y + lines.length * lh;
}

// ===== 1. ДОГОВОР С ПОДПИСЬЮ =====
export function generateContract(user: User, account: Account, signerName: string, signatureDataUrl: string | null): void {
  const doc = new jsPDF();
  const ref = 'CNT-' + Date.now().toString(36).toUpperCase().slice(-8);
  const M = 15, W = 180;
  let y: number;

  // PAGE 1
  y = drawHeader(doc, ref);
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('Договор банковского обслуживания', M, y); y += 4;
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
  doc.text(`No ${ref}`, M, y); y += 6;
  doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.5); doc.line(M, y, 195, y); y += 6;

  doc.setFontSize(9); doc.setTextColor(40, 40, 40);
  y = wt(doc, `${BANK_FULL}, действующий на основании лицензии (далее — «Банк»), и ${signerName} (далее — «Клиент»), заключили настоящий Договор о нижеследующем:`, M, y, W, 4.5); y += 6;

  const sections = [
    { title: '1. Предмет договора', items: [
      `1.1. Банк открывает Клиенту счёт «${account.name}» в валюте ${account.currency}.`,
      `1.2. Номер счёта: ${account.account_number}`,
      `1.3. IBAN: ${account.iban}`,
      `1.4. Валюта: ${account.currency}${account.currency === 'LNC' ? ` (1 LNC = $${LNC_RATE_USD})` : ''}`,
    ]},
    { title: '2. Обязанности Банка', items: [
      '2.1. Зачислять средства не позднее 1 рабочего дня.',
      '2.2. Выполнять распоряжения Клиента.',
      '2.3. Обеспечить сохранность средств.',
      '2.4. Предоставлять выписки по требованию.',
    ]},
    { title: '3. Обязанности Клиента', items: [
      '3.1. Предоставить достоверные данные.',
      '3.2. Не передавать PIN-код третьим лицам.',
      '3.3. Уведомлять об изменении данных.',
    ]},
    { title: '4. Тарифы', items: [
      '4.1. Обслуживание — бесплатно.',
      '4.2. Комиссии: Free 0.5%, Plus 0.3%, Cosmic 0%.',
      '4.3. Карты: виртуальная $0, премиум $4.99, пластик $19.99.',
      `4.4. Курс: 1 LNC = $${LNC_RATE_USD} (фиксированный).`,
    ]},
    { title: '5. Ответственность', items: [
      '5.1. Банк не отвечает за неверные реквизиты Клиента.',
      '5.2. Данные защищены SHA-256 + TLS 1.3.',
    ]},
    { title: '6. Срок действия', items: [
      '6.1. Договор бессрочный с момента электронной подписи.',
      '6.2. Расторжение — уведомление за 30 дней.',
    ]},
  ];

  for (const sec of sections) {
    if (y > 250) { drawFooter(doc, 1, 2); doc.addPage(); y = drawHeader(doc, ref); }
    doc.setFillColor(240, 240, 245); doc.rect(M, y - 3, W, 7, 'F');
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
    doc.text(sec.title, M + 3, y + 1); y += 9;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
    for (const item of sec.items) { y = wt(doc, item, M, y, W, 4.5); y += 2.5; }
    y += 3;
  }

  // Signatures
  if (y > 230) { drawFooter(doc, 1, 2); doc.addPage(); y = drawHeader(doc, ref); }
  y += 5;
  doc.setDrawColor(0, 0, 0); doc.line(M, y, 195, y); y += 8;
  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text('Подписи сторон', M, y); y += 8;

  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
  doc.text('Банк: ' + BANK_FULL, M, y); y += 5;
  doc.setTextColor(0, 130, 0); doc.text('✓ Электронная подпись подтверждена', M, y); y += 8;

  doc.setTextColor(40, 40, 40);
  doc.text(`Клиент: ${signerName}`, M, y); y += 5;
  doc.text(`Luna ID: ${user.luna_id} | @${user.username}`, M, y); y += 5;
  doc.text(`Дата: ${new Date().toLocaleDateString('ru-RU')}`, M, y); y += 5;
  doc.text('Электронная подпись:', M, y); y += 3;

  if (signatureDataUrl) {
    try { doc.addImage(signatureDataUrl, 'PNG', M, y, 60, 22); y += 25; } catch {}
  }

  drawFooter(doc, 2, 2);
  doc.save(`Luna_Bank_Contract_${ref}.pdf`);
}

// ===== 2. ВЫПИСКА =====
export function generateStatement(user: User, account: Account, transactions: any[]) {
  const doc = new jsPDF();
  const ref = 'STM-' + Date.now().toString(36).toUpperCase().slice(-8);
  let y = drawHeader(doc, ref);

  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('Справка о движении средств', 15, y); y += 6;
  doc.setDrawColor(0, 0, 0); doc.line(15, y, 195, y); y += 6;
  doc.setFontSize(10); doc.text(`${user.first_name} ${user.last_name}`, 15, y); y += 8;

  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
  doc.text(`Договор: ${user.luna_id} | Счёт: ${account.account_number}`, 15, y); y += 8;

  // Table header
  doc.setFillColor(230, 230, 238); doc.rect(15, y - 3, 180, 7, 'F');
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 70);
  doc.text('Дата', 17, y + 1); doc.text('Сумма', 55, y + 1);
  doc.text('Описание', 95, y + 1); doc.text('Статус', 180, y + 1); y += 8;

  doc.setFont('helvetica', 'normal');
  let totalIn = 0, totalOut = 0;
  transactions.slice(0, 20).forEach((tx: any, i: number) => {
    if (y > 270) { drawFooter(doc, 1, 1); doc.addPage(); y = 35; }
    const isOut = tx.from_user_id === user.telegram_id;
    if (isOut) totalOut += tx.amount; else totalIn += tx.amount;

    if (i % 2 === 0) { doc.setFillColor(248, 248, 252); doc.rect(15, y - 3, 180, 6, 'F'); }

    doc.setTextColor(60, 60, 70);
    doc.text(new Date(tx.created_at).toLocaleDateString('ru-RU'), 17, y);

    doc.setTextColor(isOut ? 200 : 0, isOut ? 0 : 130, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`${isOut ? '-' : '+'}${tx.amount.toFixed(2)} ◎`, 55, y);

    doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 50);
    doc.text(tx.type || 'transfer', 95, y);
    doc.setTextColor(0, 130, 0); doc.text('✓', 183, y);
    y += 6;
  });

  y += 5; doc.setDrawColor(0, 0, 0); doc.line(15, y, 195, y); y += 6;
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 130, 0); doc.text(`Поступления: +${totalIn.toFixed(2)} ◎`, 15, y); y += 5;
  doc.setTextColor(200, 0, 0); doc.text(`Расходы: -${totalOut.toFixed(2)} ◎`, 15, y); y += 5;
  doc.setTextColor(0, 0, 0); doc.setFontSize(10);
  doc.text(`Баланс: ${account.balance} ${account.currency}`, 15, y);

  drawFooter(doc, 1, 1);
  doc.save(`Luna_Bank_Statement_${ref}.pdf`);
}

// ===== 3. РЕКВИЗИТЫ =====
export function generateRequisites(user: User, account: Account) {
  const doc = new jsPDF();
  const ref = 'REQ-' + Date.now().toString(36).toUpperCase().slice(-8);
  let y = drawHeader(doc, ref);

  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('Справка с реквизитами счёта', 15, y); y += 6;
  doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.5); doc.line(15, y, 195, y); y += 8;
  doc.setFontSize(10); doc.text(`${user.first_name} ${user.last_name}`, 15, y); y += 10;

  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
  y = wt(doc, `${BANK_FULL} сообщает, что между Вами и Банком заключен Договор обслуживания No ${user.luna_id}. В рамках Договора открыт счёт No ${account.account_number}.`, 15, y, 180, 4.5);
  y += 8;

  doc.setFont('helvetica', 'bold'); doc.text('Реквизиты:', 15, y); y += 7;

  const reqs: [string, string][] = [
    ['Банк:', BANK_FULL],
    ['SWIFT:', 'LUNABKXX'],
    ['Счёт:', account.account_number],
    ['IBAN:', account.iban],
    ['Валюта:', `${account.currency}${account.currency === 'LNC' ? ` (1 LNC = $${LNC_RATE_USD})` : ''}`],
    ['Получатель:', `${user.first_name} ${user.last_name}`],
    ['Luna ID:', user.luna_id],
    ['Telegram:', `@${user.username}`],
  ];

  doc.setFontSize(9);
  for (const [label, val] of reqs) {
    doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80); doc.text(label, 15, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0); doc.text(val, 60, y);
    y += 5.5;
  }

  y += 10; doc.setTextColor(40, 40, 40);
  doc.text('С уважением,', 15, y); y += 5;
  doc.setFont('helvetica', 'bold'); doc.text('Luna Bank Digital Operations', 15, y);

  drawFooter(doc, 1, 1);
  doc.save(`Luna_Bank_Requisites_${ref}.pdf`);
}
