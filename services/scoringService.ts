
import { Lead, MarketInsight, Dealership } from "../types";
import { REGION_ADJACENCY } from "../constants";

// Keywords indicating high buying intent
const HIGH_INTENT_KEYWORDS = [
  'cash', 'approved', 'urgent', 'immediate', 'buy now', 'ready to buy', 
  'financing ready', 'pre-approved', 'settlement', 'serious buyer'
];

// Keywords indicating research or medium intent
const MEDIUM_INTENT_KEYWORDS = [
  'trade-in', 'test drive', 'quote', 'finance', 'price', 'availability', 
  'looking for', 'interested', 'specs', 'installment'
];

/**
 * Calculates a score (0-100) for an existing lead in the CRM.
 * Factors: Sentiment, Contact Completeness, Intent Keywords, Time of Day, Recency, Dealer Proximity.
 */
export const calculateLeadScore = (lead: Lead, dealers: Dealership[] = []): number => {
  let score = 0;

  // 1. Sentiment Analysis (Base Score)
  if (lead.sentiment === 'HOT') score += 35;
  else if (lead.sentiment === 'Warm') score += 20;
  else score += 10;

  // 2. Contact Information Completeness
  if (lead.contactPhone) score += 25;
  if (lead.contactEmail) score += 15;
  
  // 3. Keyword Analysis (Intent from Summary & Source)
  const text = (lead.intentSummary + ' ' + lead.source).toLowerCase();
  if (HIGH_INTENT_KEYWORDS.some(k => text.includes(k))) score += 15;
  else if (MEDIUM_INTENT_KEYWORDS.some(k => text.includes(k))) score += 5;

  // 4. Time of Day (Business Hours Bonus: 08:00 - 17:00)
  // Only applies if we have a full timestamp
  if (lead.dateDetected.includes('T')) {
    const date = new Date(lead.dateDetected);
    const hour = date.getHours();
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Bonus for inquiries coming in during active business hours (Mon-Fri, 8am-5pm)
    if (day >= 1 && day <= 5 && hour >= 8 && hour <= 17) {
        score += 10;
    }
  }

  // 5. Recency (Decay)
  const leadDate = new Date(lead.dateDetected);
  const now = new Date();
  const diffHours = (now.getTime() - leadDate.getTime()) / (1000 * 60 * 60);
  
  if (diffHours < 24) score += 15;      // < 24 hours
  else if (diffHours < 72) score += 10; // < 3 days
  else if (diffHours < 168) score += 5; // < 1 week

  // 6. Proximity / Region Match (If assigned)
  if (lead.assignedDealerId) {
      const dealer = dealers.find(d => d.id === lead.assignedDealerId);
      if (dealer) {
          if (dealer.region === lead.region) {
              score += 20; // Exact Region Match
          } else if (REGION_ADJACENCY[dealer.region]?.includes(lead.region)) {
              score += 10; // Neighboring Region
          }
      }
  }

  // Cap at 100
  return Math.min(Math.round(score), 100);
};

/**
 * Calculates a potential score for a market search result before it is added to the CRM.
 */
export const calculateInsightScore = (insight: MarketInsight, searchRegion: string): number => {
    let score = 0;
    
    // Sentiment
    if (insight.sentiment === 'HOT') score += 35;
    else if (insight.sentiment === 'Warm') score += 20;
    else score += 10;

    // Contact Info (Extracted)
    if (insight.extractedContact?.phone) score += 25;
    if (insight.extractedContact?.email) score += 15;

    // Keywords
    const text = (insight.summary + ' ' + insight.topic).toLowerCase();
    if (HIGH_INTENT_KEYWORDS.some(k => text.includes(k))) score += 15;
    else if (MEDIUM_INTENT_KEYWORDS.some(k => text.includes(k))) score += 5;

    // Implicit Region Match (Result found via region-specific search)
    // We give a small baseline bonus assuming the search filter worked
    score += 5; 

    return Math.min(Math.round(score), 100);
};
