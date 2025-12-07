import { GoogleGenAI } from "@google/genai";
import { MarketInsight } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found. Ensure process.env.API_KEY is set.");
  return new GoogleGenAI({ apiKey });
};

export const searchMarketLeads = async (
  brand: string,
  model: string,
  trim: string,
  region: string,
  type: 'New' | 'Used' | 'Demo',
  fuel?: string,
  transmission?: string,
  mileage?: { min: string; max: string }
): Promise<MarketInsight[]> => {
  const ai = getAiClient();
  
  // Construct specific vehicle string with high detail
  // If Brand is 'Any' or empty, we rely solely on the Model/Keyword for the search
  const effectiveBrand = brand === 'Any' ? '' : brand;
  let vehicleQuery = `${type} ${effectiveBrand} ${model}`.replace(/\s+/g, ' ').trim();
  
  if (trim) vehicleQuery += ` ${trim}`;
  if (fuel && fuel !== 'Any') vehicleQuery += ` ${fuel}`;
  if (transmission && transmission !== 'Any') vehicleQuery += ` ${transmission}`;

  // Construct mileage context
  let mileageContext = "";
  if (mileage && (mileage.min || mileage.max)) {
    mileageContext = `Mileage preference: ${mileage.min || '0'}km to ${mileage.max || 'any'}km.`;
  }

  // Improved Prompt Engineering for better data retrieval
  const prompt = `
    Act as an expert automotive market researcher in South Africa.
    
    TASK:
    Conduct a comprehensive search for active vehicle opportunities for a dealership in ${region}.
    Target Vehicle: ${vehicleQuery}
    ${mileageContext}
    
    SEARCH OBJECTIVES:
    Use Google Search to find real-time, recent (last 30 days) opportunities from:
    1. Classified Listings (Private sellers on Gumtree, JunkMail, Private Property, etc.)
    2. Social Media (Facebook Marketplace, Facebook Groups like "VW Club SA", "4x4 Community")
    3. Forum Discussions (MyBroadband, 4x4Community, CarForums)
    
    CRITICAL INSTRUCTIONS:
    - Look for "FOR SALE" listings by private individuals (potential stock acquisition).
    - Look for "WANTED" or "LOOKING FOR" posts (potential buyers).
    - EXCLUDE listings from major aggregator dealerships if possible; focus on private market signals.
    - ${trim ? `MUST match the specific variant: "${trim}"` : 'Ensure results match the model specs.'}
    
    OUTPUT FORMATTING:
    You must output the data in a strict, parsed format.
    Do NOT include any conversational filler text. Start immediately with the items.
    Separate each result block with exactly: "---LEAD_ITEM---"
    
    For each item, strictly use these keys:
    Topic: [Brief Title, e.g. "2023 Ford Ranger Wildtrak - Private Sale"]
    Sentiment: ["HOT" (Active Buyer/Seller), "Warm" (Researching), "Cold"]
    Summary: [Key details: Price, Year, Mileage, and Condition]
    SourceTitle: [Name of the site, e.g. "Facebook Marketplace"]
    SourceURI: [Direct URL to the listing/post]
    SourcePlatform: [e.g. "Facebook", "Gumtree", "Forum", "Other"]
    ContextDealer: [Seller Name or "Private Seller"]
    ContactName: [Name if publicly available, else "N/A"]
    ContactPhone: [Phone if publicly available, else "N/A"]
    ContactEmail: [Email if publicly available, else "N/A"]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "";
    return parseLeadsFromText(text);
  } catch (error) {
    console.error("Lead Search Error:", error);
    throw error;
  }
};

export const generateOutreachScript = async (
  leadSummary: string, 
  sourcePlatform: string, 
  brandName: string
): Promise<string> => {
  const ai = getAiClient();
  
  const prompt = `
    Write a short, professional, and friendly outreach message to a potential car buyer.
    Context: We found their post/listing about wanting to buy a vehicle.
    Lead Summary: "${leadSummary}"
    Source: Found on ${sourcePlatform}.
    Our Dealership Brand: ${brandName}.

    Goal: Introduce our dealership, mention we have stock matching their needs, and invite them for a chat.
    Constraint: Keep it under 280 characters if possible (suitable for WhatsApp/SMS) or short email format.
    Tone: Helpful, not spammy. adhere to POPIA (South African privacy act) by stating how we found their public info.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text || "Could not generate script.";
};

export const generateFollowUpScript = async (
  contactName: string,
  vehicleModel: string,
  dealerName: string
): Promise<string> => {
  const ai = getAiClient();

  const prompt = `
    Write a polite, concise follow-up email to a potential customer who previously inquired about a vehicle.
    Customer Name: ${contactName || 'Valued Customer'}
    Vehicle Interest: ${vehicleModel}
    Dealership: ${dealerName}

    Goal: Re-engage the customer. Ask if they are still looking for a vehicle or if they would like to book a test drive.
    Tone: Professional, non-intrusive, helpful.
    Format: Email body text only.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text || "Could not generate follow-up script.";
};

export const generateSocialPost = async (
  leadData: { brand: string; model: string; summary: string; sentiment: string },
  platform: 'LinkedIn' | 'Facebook' | 'Instagram' | 'Twitter'
): Promise<string> => {
  const ai = getAiClient();

  const prompt = `
    Act as a social media manager for a car dealership.
    Generate a ${platform} post based on this high-intent market signal we just detected.

    Vehicle: ${leadData.brand} ${leadData.model}
    Market Context: "${leadData.summary}"
    Sentiment: ${leadData.sentiment}

    Goal: Alert our network that we have a buyer/seller match or that we are looking for stock to match this lead.
    Tone: ${platform === 'LinkedIn' ? 'Professional and B2B focused' : 'Engaging, exciting, and consumer-focused'}.
    Requirements: Include emojis and 3-5 relevant hashtags (e.g., #AutoLeadSA, #${leadData.brand.replace(/\s/g, '')}).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text || "Could not generate social post.";
};

export const generateMarketingVideo = async (
  prompt: string,
  resolution: '1080p' | '720p',
  aspectRatio: '16:9' | '9:16'
): Promise<string | null> => {
    const ai = getAiClient();
    const apiKey = process.env.API_KEY;

    try {
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: resolution,
          aspectRatio: aspectRatio
        }
      });

      // Poll for completion (Veo videos take time)
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({operation: operation});
      }

      if (operation.response?.generatedVideos?.[0]?.video?.uri) {
         const downloadLink = operation.response.generatedVideos[0].video.uri;
         // Append API key for restricted download access
         return `${downloadLink}&key=${apiKey}`;
      }
      return null;
    } catch (error) {
      console.error("Video Generation Error:", error);
      throw error;
    }
};

export const generatePitchScript = async (context: string): Promise<string> => {
  const ai = getAiClient();
  const prompt = `
    Act as a professional automotive marketing copywriter.
    Write a script or social media post based on the following context:
    "${context}"

    Requirements:
    - Engaging and high-conversion.
    - Professional tone.
    - Include relevant emojis if it's for social media.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Could not generate script.";
  } catch (error) {
    console.error("Pitch Script Error:", error);
    throw error;
  }
};

// Helper function to parse the structured text from Gemini
const parseLeadsFromText = (text: string): MarketInsight[] => {
  const leads: MarketInsight[] = [];
  const parts = text.split("---LEAD_ITEM---");

  for (const part of parts) {
    if (!part.trim()) continue;

    // Clean up markdown bolding from keys if present to ensure regex matches
    const cleanPart = part.replace(/\*\*/g, "");

    const topic = extractValue(cleanPart, "Topic");
    if (!topic) continue;

    const lead: any = {
      topic: topic,
      sentiment: extractValue(cleanPart, "Sentiment") || "Warm",
      summary: extractValue(cleanPart, "Summary") || "Details unavailable.",
      sources: [{
        title: extractValue(cleanPart, "SourceTitle") || "Search Result",
        uri: extractValue(cleanPart, "SourceURI") || "#"
      }],
      sourcePlatform: extractValue(cleanPart, "SourcePlatform") || "Web",
      contextDealer: extractValue(cleanPart, "ContextDealer") || "Unknown",
      extractedContact: {
        name: extractValue(cleanPart, "ContactName"),
        phone: extractValue(cleanPart, "ContactPhone"),
        email: extractValue(cleanPart, "ContactEmail")
      }
    };

    // Clean N/A values
    if (lead.extractedContact.name === "N/A") delete lead.extractedContact.name;
    if (lead.extractedContact.phone === "N/A") delete lead.extractedContact.phone;
    if (lead.extractedContact.email === "N/A") delete lead.extractedContact.email;

    leads.push(lead as MarketInsight);
  }
  return leads;
};

const extractValue = (text: string, key: string): string => {
  // Robust regex to capture value after Key:, handling case and potential whitespace
  const regex = new RegExp(`${key}\\s*:\\s*(.*)`, "i");
  const match = text.match(regex);
  return match ? match[1].trim() : "";
};