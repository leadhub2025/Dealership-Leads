
import { Lead, Dealership, LeadStatus } from "../types";

export const generateCSV = (leads: Lead[]): string => {
  // Define Headers
  const headers = [
    "Lead ID",
    "Date Detected",
    "Brand",
    "Model",
    "Type/Source",
    "Status",
    "Sentiment",
    "Lead Score",
    "Contact Name",
    "Contact Phone",
    "Contact Email",
    "Region",
    "Intent Summary",
    "Assigned Dealer ID",
    "Source URL"
  ];

  // Helper to escape special characters (commas, quotes, newlines)
  const escape = (value: string | number | undefined | null) => {
    if (value === undefined || value === null) return '""';
    const stringValue = String(value);
    // Escape double quotes by doubling them
    const escaped = stringValue.replace(/"/g, '""');
    // Wrap in quotes to handle commas and newlines
    return `"${escaped}"`;
  };

  const rows = leads.map(lead => {
    // Calculate basic score for export context
    let score = 0;
    if (lead.sentiment === 'HOT') score += 40;
    else if (lead.sentiment === 'Warm') score += 25;
    else score += 10;
    if (lead.contactPhone) score += 30;
    if (lead.contactEmail) score += 10;
    // (Simplified recency calc for export consistency)
    const daysDiff = Math.ceil(Math.abs(new Date().getTime() - new Date(lead.dateDetected).getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 3) score += 20;
    else if (daysDiff <= 7) score += 10;


    return [
      escape(lead.id),
      escape(lead.dateDetected),
      escape(lead.brand),
      escape(lead.model),
      escape(lead.source),
      escape(lead.status),
      escape(lead.sentiment || 'N/A'),
      escape(Math.min(score, 100)), // Score
      escape(lead.contactName),
      escape(lead.contactPhone),
      escape(lead.contactEmail),
      escape(lead.region),
      escape(lead.intentSummary),
      escape(lead.assignedDealerId || 'Unassigned'),
      escape(lead.groundingUrl)
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
};

export const generateDealerPerformanceCSV = (dealers: Dealership[], leads: Lead[]): string => {
  const headers = [
    "Dealer Name",
    "Brand",
    "Region",
    "Contact Person",
    "Email",
    "Status",
    "Plan",
    "Leads Assigned",
    "Leads Converted",
    "Conversion Rate (%)",
    "Pipeline Value (Est ZAR)"
  ];

  const escape = (value: any) => {
     if (value === undefined || value === null) return '""';
     const stringValue = String(value);
     const escaped = stringValue.replace(/"/g, '""');
     return `"${escaped}"`;
  };

  const rows = dealers.map(d => {
    const dealerLeads = leads.filter(l => l.assignedDealerId === d.id);
    const converted = dealerLeads.filter(l => l.status === LeadStatus.CONVERTED).length;
    const rate = d.leadsAssigned > 0 ? ((converted / d.leadsAssigned) * 100).toFixed(1) : "0.0";
    
    // Estimate pipeline: active leads (not New/Archived/Converted) * avg value * probability
    const active = dealerLeads.filter(l => l.status !== LeadStatus.NEW && l.status !== LeadStatus.ARCHIVED && l.status !== LeadStatus.CONVERTED).length;
    const pipeline = active * 500000 * 0.1;

    return [
        escape(d.name),
        escape(d.brand),
        escape(d.region),
        escape(d.contactPerson),
        escape(d.email),
        escape(d.status),
        escape(d.billing?.plan || 'Standard'),
        escape(d.leadsAssigned || 0),
        escape(converted),
        escape(rate),
        escape(pipeline.toFixed(2))
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
};

export const generateInvoiceCSV = (dealer: Dealership, leads: Lead[]): string => {
  const invoiceNum = `INV-${dealer.id.substring(0,4).toUpperCase()}-${new Date().getMonth() + 1}${new Date().getFullYear()}`;
  const date = new Date().toISOString().split('T')[0];
  
  // Filter leads assigned to this dealer (if available)
  const dealerLeads = leads.filter(l => l.assignedDealerId === dealer.id);
  
  const totalCost = dealer.leadsAssigned * dealer.billing.costPerLead;

  const escape = (value: any) => {
    if (value === undefined || value === null) return '""';
    const stringValue = String(value);
    const escaped = stringValue.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const lines = [
    `INVOICE ${invoiceNum}`,
    `Date: ${date}`,
    `Bill To: ${escape(dealer.name)}`,
    `Region: ${escape(dealer.region)}`,
    `Email: ${escape(dealer.email)}`,
    ``,
    `Description,Quantity,Unit Price (ZAR),Total (ZAR)`,
    `Lead Generation Services - ${dealer.billing.plan} Plan,${dealer.leadsAssigned},${dealer.billing.costPerLead},${totalCost.toFixed(2)}`,
    ``,
    `Itemized Lead Details`,
    `Lead ID,Date,Vehicle,Source,Status`
  ];

  dealerLeads.forEach(l => {
    lines.push(`${escape(l.id)},${escape(l.dateDetected)},"${escape(l.brand + ' ' + l.model)}",${escape(l.source)},${escape(l.status)}`);
  });

  return lines.join('\n');
};

export const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
