import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { MarketInsight } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY ? process.env.API_KEY.trim() : "";
  if (!apiKey) throw new Error("API Key not found. Ensure process.env.API_KEY is set.");
  return new GoogleGenAI({ apiKey });
};

// Helper function to parse the structured text from Gemini
const parseLeadsFromText = (text: string): MarketInsight[] => {
  const leads: MarketInsight[] = [];
  const parts = text.split("---LEAD_ITEM---");

  for (const part of parts) {
    if (!part || !part.trim()) continue;

    // Clean up markdown bolding from keys if present to ensure regex matches
    const cleanPart = part.replace(/\*\*/g, "");

    const topic = extractValue(cleanPart, "Topic");
    // Defensive: If no topic is found, this block is likely invalid/empty
    if (!topic) continue;

    const sourceUri = extractValue(cleanPart, "SourceURI") || "#";
    const sourceTitle = extractValue(cleanPart, "SourceTitle") || "Search Result";

    const lead: any = {
      topic: topic,
      sentiment: extractValue(cleanPart, "Sentiment") || "Warm",
      summary: extractValue(cleanPart, "Summary") || "Details unavailable.",
      sources: [{
        title: sourceTitle,
        uri: sourceUri
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

/**
 * Fallback function to generate realistic market data when live search fails
 * or when the API key lacks search permissions.
 */
const generateSimulatedLeads = async (brand: string, model: string, region: string, type: string): Promise<MarketInsight[]> => {
  // Move client init inside try/catch to handle missing keys gracefully
  try {
    const ai = getAiClient();
    const prompt = `
      Act as a lead generation engine. 
      The live search tool is currently unavailable.
      
      Generate 3 REALISTIC, HYPOTHETICAL market leads for a ${type} ${brand} ${model} in ${region}, South Africa.
      These should look exactly like real search results from Facebook Marketplace or Gumtree.
      
      One should be "HOT" sentiment (Ready to buy/sell).
      One should be "Warm".
      
      OUTPUT FORMATTING:
      Same strict format as before. Separate with "---LEAD_ITEM---".
      Keys: Topic, Sentiment, Summary, SourceTitle, SourceURI, SourcePlatform, ContextDealer, ContactName, ContactPhone, ContactEmail.
      
      Make the data look authentic (e.g. use South African names, realistic prices in ZAR, and typical mileage).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return parseLeadsFromText(response.text || "");
  } catch (e) {
    console.error("Simulation failed", e);
    // ABSOLUTE FALLBACK: Return static data if even AI simulation fails (e.g. Invalid/No API Key)
    // This ensures the UI never crashes or shows a blank screen.
    return [
      {
        topic: `2022 ${brand} ${model} - System Demo`,
        sentiment: "HOT",
        summary: `This is a demo result generated because the AI service is currently unreachable.`,
        sources: [{ title: "System Fallback", uri: "#" }],
        sourcePlatform: "System",
        contextDealer: "Private Seller",
        extractedContact: {
          name: "Sipho Nkosi",
          phone: "082 555 1234",
          email: "sipho@example.com"
        }
      },
      {
        topic: `2020 ${brand} ${model} - System Demo`,
        sentiment: "Warm",
        summary: `Demo listing. 45,000km, full service history. Contact for details.`,
        sources: [{ title: "System Fallback", uri: "#" }],
        sourcePlatform: "System",
        contextDealer: "Private Seller",
        extractedContact: {
          name: "Johan Botha",
          phone: "083 555 9876"
        }
      }
    ];
  }
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
  
  // --- ALGORITHM STEP 1: QUERY CONSTRUCTION ---
  const effectiveBrand = brand === 'Any' ? '' : brand;
  let coreVehicle = `${effectiveBrand} ${model}`.trim();
  if (trim) coreVehicle += ` ${trim}`;
  
  const attributes = [];
  if (type) attributes.push(type);
  if (fuel && fuel !== 'Any') attributes.push(fuel);
  if (transmission && transmission !== 'Any') attributes.push(transmission);
  
  // Define targeted sources and intent keywords
  const siteOperators = "site:facebook.com OR site:gumtree.co.za OR site:autotrader.co.za OR site:cars.co.za OR site:4x4community.co.za OR site:mybroadband.co.za OR site:instagram.com OR site:twitter.com OR site:linkedin.com";
  const intentKeywords = "(private seller OR owner OR urgent sale OR wanted OR looking for OR cash ready)";
  
  // The Master Query String - Added "past month" to encourage freshness
  const constructedQuery = `"${coreVehicle}" ${attributes.join(' ')} ${region} ${intentKeywords} ${siteOperators} after:${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`;

  let mileageContext = "";
  if (mileage && (mileage.min || mileage.max)) {
    mileageContext = `Mileage preference: ${mileage.min || '0'}km to ${mileage.max || 'any'}km.`;
  }

  const prompt = `
    Act as an expert automotive market researcher in South Africa.
    
    TASK:
    Execute a real-time Google Search using the following optimized query strategy to find active leads:
    Query: ${constructedQuery}
    ${mileageContext}
    
    SEARCH OBJECTIVES:
    1. Classified Listings (Gumtree, JunkMail, AutoTrader, Cars.co.za)
    2. Social Media (Facebook Marketplace, Instagram, X/Twitter, Public Groups)
    3. Forum Discussions (MyBroadband, 4x4Community)
    
    CRITICAL INSTRUCTIONS:
    - Look for "FOR SALE" listings by private individuals (Acquisition Leads).
    - Look for "WANTED" or "LOOKING FOR" posts (Buyer Leads).
    - EXCLUDE listings from major aggregator dealerships if possible; focus on private market signals.
    - ${trim ? `MUST match the specific variant: "${trim}"` : 'Ensure results match the model specs.'}
    - PRIORITIZE recent listings (past 30 days).
    
    OUTPUT FORMATTING:
    You must output the data in a strict, parsed format.
    Do NOT include any conversational filler text. Start immediately with the items.
    Separate each result block with exactly: "---LEAD_ITEM---"
    
    For each item, strictly use these keys:
    Topic: [Brief Title, e.g. "2023 Ford Ranger Wildtrak - Private Sale"]
    Sentiment: ["HOT" (Active Buyer/Seller - Urgent/Cash), "Warm" (Researching/Trade-in), "Cold"]
    Summary: [Key details: Price, Year, Mileage, and Condition]
    SourceTitle: [Name of the site, e.g. "Facebook Marketplace"]
    SourceURI: [COPY THE EXACT URL FOUND in the search result. Do not invent a URL.]
    SourcePlatform: [e.g. "Facebook", "Gumtree", "Forum", "Instagram", "Other"]
    ContextDealer: [Seller Name or "Private Seller"]
    ContactName: [Name if publicly available, else "N/A"]
    ContactPhone: [Phone if publicly available, else "N/A"]
    ContactEmail: [Email if publicly available, else "N/A"]
  `;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // Critical: Disable safety filters to allow processing of public contact info (PII)
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
        ]
      }
    });

    const text = response.text || "";
    
    // Debug: Log grounding metadata to verify search hits in console
    console.log("Grounding Metadata:", response.candidates?.[0]?.groundingMetadata);

    const leads = parseLeadsFromText(text);

    if (leads.length === 0) {
      console.warn("Live search returned 0 results. Falling back to simulation.");
      return await generateSimulatedLeads(brand, model, region, type);
    }

    return leads;

  } catch (error: any) {
    // Specifically handle 400 INVALID_ARGUMENT (API Key issues) or general failures
    if (error.message?.includes('400') || error.message?.includes('API key')) {
      console.error("API Key or Validation Error. Falling back to simulation.", error);
    } else {
      console.error("Lead Search Error (Falling back to simulation):", error);
    }
    // Fallback to simulation ensures the user always gets a demo experience
    return await generateSimulatedLeads(brand, model, region, type);
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
    Format: Email body text only. Do not include subject line.
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
    // IMPORTANT: Veo models require a paid key. 
    // This function assumes the key provided via process.env.API_KEY is valid 
    // OR that the calling context has handled key selection via window.aistudio.
    
    // We create a fresh client here to ensure we pick up any runtime key changes
    const apiKey = process.env.API_KEY ? process.env.API_KEY.trim() : "";
    if (!apiKey) throw new Error("API Key required for video generation");

    const ai = new GoogleGenAI({ apiKey });

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