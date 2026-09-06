import { jsPDF } from 'jspdf';
import { Reserva, MonthlyReportData, Propriedade } from '../types';
import { formatDateBR, formatCurrency } from './security';

export function exportReservationsToCSV(reservas: Reserva[], filename = 'reservas_stay_pro.csv') {
  const headers = [
    'Código',
    'Hóspede',
    'Telefone',
    'E-mail',
    'Qtd Pessoas',
    'Check-in',
    'Check-out',
    'Valor Total (R$)',
    'Sinal Pago',
    'Valor Sinal (R$)',
    'Saldo Restante (R$)',
    'Forma de Pagamento',
    'Status Reserva',
    'Status Financeiro',
    'Observações'
  ];

  const rows = reservas.map((r) => [
    r.codigo,
    `"${(r.hospede || '').replace(/"/g, '""')}"`,
    `"${r.telefone || ''}"`,
    `"${r.email || ''}"`,
    r.qtdPessoas,
    formatDateBR(r.checkIn),
    formatDateBR(r.checkOut),
    r.valorTotal.toFixed(2),
    r.sinalPago ? 'Sim' : 'Não',
    r.valorSinal.toFixed(2),
    r.saldoRestante.toFixed(2),
    `"${r.formaPagamento || r.formaPagamentoSinal || ''}"`,
    r.status,
    r.statusFinanceiro,
    `"${(r.observacoes || r.motivoBloqueio || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportMonthlyReportToPDF(report: MonthlyReportData, propriedade?: Propriedade) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('STAY PRO - RELATÓRIO MENSAL', 14, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Imóvel: ${propriedade?.nome || 'Propriedade'} | Período: ${report.mesNome}`, 14, 24);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 155, 24);

  // Summary KPI Cards in PDF
  doc.setTextColor(30, 41, 59);
  let y = 42;

  // Box 1: Total Reservas
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, y, 42, 22, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL RESERVAS', 18, y + 7);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${report.totalReservas}`, 18, y + 16);

  // Box 2: Faturamento Bruto
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(60, y, 42, 22, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('FATURAMENTO', 64, y + 7);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // emerald-600
  doc.text(formatCurrency(report.faturamentoBruto), 64, y + 16);

  // Box 3: Diária Média (ADR)
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(106, y, 42, 22, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('DIÁRIA MÉDIA', 110, y + 7);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(report.mediaDiaria), 110, y + 16);

  // Box 4: Taxa de Ocupação
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(152, y, 44, 22, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('TAXA OCUPAÇÃO', 156, y + 7);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text(`${report.taxaOcupacao}%`, 156, y + 16);

  // Table Title
  y = 74;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Detalhamento das Reservas do Mês', 14, y);

  // Table Header
  y = 80;
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('#', 17, y + 5.5);
  doc.text('Hóspede', 32, y + 5.5);
  doc.text('Check-in', 80, y + 5.5);
  doc.text('Check-out', 105, y + 5.5);
  doc.text('Status', 130, y + 5.5);
  doc.text('Valor (R$)', 165, y + 5.5);

  // Table Rows
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  report.reservas.forEach((r, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 7, 'F');
    }

    doc.setTextColor(51, 65, 85);
    doc.text(r.codigo, 17, y + 5);
    doc.text(r.hospede.length > 24 ? `${r.hospede.slice(0, 22)}...` : r.hospede, 32, y + 5);
    doc.text(formatDateBR(r.checkIn), 80, y + 5);
    doc.text(formatDateBR(r.checkOut), 105, y + 5);
    doc.text(r.status, 130, y + 5);
    doc.text(formatCurrency(r.valorTotal), 165, y + 5);

    y += 7;
  });

  // Footer / LGPD compliance note
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Stay Pro Gestão de Temporada • Documento confidencial em conformidade com a LGPD', 14, 290);

  doc.save(`relatorio_${report.mesAno}_stay_pro.pdf`);
}
