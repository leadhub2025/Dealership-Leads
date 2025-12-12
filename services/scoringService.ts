
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

// Source Quality Weights (Higher = Better conversion probability)
const SOURCE_WEIGHTS: Record<string, number> = {
  'website': 20, // Direct web inquiry
  'autotrader': 15,
  'cars.co.za': 15,
  'gumtree': 10,
  'facebook marketplace': 10,
  'facebook group': 5,
  'instagram': 5,
  'twitter': 5,
  'forum': 8,
  '4x4community': 10,
  'web search': 5
};

/**
 * Calculates a score (0-100) for an existing lead in the CRM.
 * Factors: Sentiment, Contact Completeness, Source Quality, Recency, Keyword Analysis, Dealer Proximity.
 */
export const calculateLeadScore = (lead: Lead, dealers: Dealership[] = []): number => {
  let score = 0;

  // 1. Sentiment Analysis (Base Score)
  if (lead.sentiment === 'HOT') score += 25;
  else if (lead.sentiment === 'Warm') score += 15;
  else score += 5;

  // 2. Contact Information Completeness (Critical)
  // Phone numbers are significantly more valuable for immediate conversion
  if (lead.contactPhone) {
    score += 30;
  } else if (lead.contactEmail) {
    score += 15;
  }
  // Bonus if both are present
  if (lead.contactPhone && lead.contactEmail) {
    score += 10;
  }

  // 3. Source Quality Analysis
  let sourceScore = 5; // Default baseline
  const lowerSource = (lead.source || '').toLowerCase();
  
  for (const [key, weight] of Object.entries(SOURCE_WEIGHTS)) {
    if (lowerSource.includes(key)) {
      sourceScore = weight;
      break;
    }
  }
  score += sourceScore;
  
  // 4. Keyword Analysis (Intent from Summary)
  const text = (lead.intentSummary || '').toLowerCase();
  if (HIGH_INTENT_KEYWORDS.some(k => text.includes(k))) score += 10;
  else if (MEDIUM_INTENT_KEYWORDS.some(k => text.includes(k))) score += 5;

  // 5. Recency (Decay) - Freshness is key in auto sales
  const leadDate = new Date(lead.dateDetected);
  const now = new Date();
  const diffHours = (now.getTime() - leadDate.getTime()) / (1000 * 60 * 60);
  
  if (diffHours < 12) score += 20;      // < 12 hours (Hot/Fresh)
  else if (diffHours < 24) score += 15; // < 24 hours
  else if (diffHours < 48) score += 10; // < 2 days
  else if (diffHours < 168) score += 5; // < 1 week
  // Leads older than a week get 0 recency points

  // 6. Time of Day (Business Hours Bonus: 08:00 - 17:00)
  // Only applies if we have a full timestamp
  if (lead.dateDetected.includes('T')) {
    const hour = leadDate.getHours();
    const day = leadDate.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Bonus for inquiries coming in during active business hours (Mon-Fri)
    if (day >= 1 && day <= 5 && hour >= 8 && hour <= 17) {
        score += 5;
    }
  }

  // 7. Proximity / Region Match (If assigned)
  if (lead.assignedDealerId) {
      const dealer = dealers.find(d => d.id === lead.assignedDealerId);
      if (dealer) {
          if (dealer.region === lead.region) {
              score += 15; // Exact Region Match
          } else if (REGION_ADJACENCY[dealer.region]?.includes(lead.region)) {
              score += 5; // Neighboring Region
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
    if (insight.sentiment === 'HOT') score += 30;
    else if (insight.sentiment === 'Warm') score += 15;
    else score += 5;

    // Contact Info (Extracted)
    if (insight.extractedContact?.phone) score += 35;
    if (insight.extractedContact?.email) score += 15;

    // Source Quality
    const lowerSource = (insight.sourcePlatform || insight.sources?.[0]?.title || '').toLowerCase();
    let sourceScore = 5;
    for (const [key, weight] of Object.entries(SOURCE_WEIGHTS)) {
        if (lowerSource.includes(key)) {
        sourceScore = weight;
        break;
        }
    }
    score += sourceScore;

    // Keywords
    const text = (insight.summary + ' ' + insight.topic).toLowerCase();
    if (HIGH_INTENT_KEYWORDS.some(k => text.includes(k))) score += 10;
    else if (MEDIUM_INTENT_KEYWORDS.some(k => text.includes(k))) score += 5;

    // Implicit Region Match (Result found via region-specific search)
    // We give a small baseline bonus assuming the search filter worked
    score += 5; 

    return Math.min(Math.round(score), 100);
};
