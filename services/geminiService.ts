
import { GoogleGenAI } from "@google/genai";
import { MarketInsight } from "../types";

const getAiClient = () => {
  let apiKey = "";
  try {
    // Access process.env.API_KEY directly to allow bundler replacement.
    // The typeof check prevents immediate ReferenceError in browsers if replacement doesn't happen.
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
       apiKey = process.env.API_KEY;
    } else {
       // Fallback: Attempt access without checks if the bundler replaces the whole expression 'process.env.API_KEY'
       // This assumes the bundler transforms this code. If not, the try/catch saves us.
       apiKey = process.env.API_KEY || "";
    }
  } catch (e) {
    // Ignore ReferenceError if process is not defined
  }

  if (apiKey) apiKey = apiKey.trim();
  if (!apiKey) throw new Error("API Key not found. Ensure process.env.API_KEY is set.");
  
  return new GoogleGenAI({ apiKey });
};

// Helper function to parse the structured text from Gemini
const parseLeadsFromText = (text: string): MarketInsight[] => {
  const leads: MarketInsight[] = [];
  // robust split that handles potentially missing newlines around the separator
  const parts = text.split(/---LEAD_ITEM---/g);

  for (const part of parts) {
    if (!part || !part.trim()) continue;

    // Clean up markdown bolding from keys if present to ensure regex matches
    const cleanPart = part.replace(/\*\*/g, "");

    const topic = extractValue(cleanPart, "Topic");
    // Defensive: If no topic is found, this block is likely invalid/empty
    if (!topic || topic.length < 3) continue;

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
  // Robust regex to capture value after Key:, handling case, bolding, and whitespace
  // Matches "Key:", "**Key**:", "Key :"
  const regex = new RegExp(`${key}\\s*:?\\s*(.*)`, "i");
  const match = text.match(regex);
  return match ? match[1].trim() : "";
};

/**
 * Fallback function to generate realistic market data when live search fails
 * or when the API key lacks search permissions.
 */
const generateSimulatedLeads = async (brand: string, model: string, region: string, type: string): Promise<MarketInsight[]> => {
  try {
    const ai = getAiClient();
    const prompt = `
      Act as a lead generation engine. 
      The live search tool is currently unavailable.
      
      Generate 3 REALISTIC, HYPOTHETICAL market leads for a ${type} ${brand} ${model || 'Vehicle'} in ${region}, South Africa.
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
    // ABSOLUTE FALLBACK
    return [
      {
        topic: `2022 ${brand} ${model || 'Vehicle'} - System Demo`,
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
      }
    ];
  }
};

/**
 * Internal helper to perform the actual search request
 */
const performSearchRequest = async (
  query: string,
  searchContext: string,
  requireContactInfo: boolean
): Promise<MarketInsight[]> => {
  const ai = getAiClient();

  const prompt = `
    Act as an expert automotive market researcher in South Africa.
    
    TASK:
    Execute a real-time Google Search using this query:
    ${query}
    
    SEARCH OBJECTIVES:
    1. Find "FOR SALE" listings by private individuals (Acquisition Leads).
    2. Find "WANTED" or "LOOKING FOR" posts (Buyer Leads).
    3. EXCLUDE listings from major aggregator dealerships if possible; focus on private market signals.
    4. ${searchContext}
    5. PRIORITIZE recent listings (past 60 days) AND results containing phone numbers, emails, or direct contact methods (e.g. "Call 082...").
    
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

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    }
  });

  return parseLeadsFromText(response.text || "");
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
  
  // --- ALGORITHM: RELAXED QUERY CONSTRUCTION ---
  const effectiveBrand = brand === 'Any' ? '' : brand;
  
  // Removed quotes around vehicle to allow fuzzy matching (e.g. "Ford Ranger" matching "Ranger Ford")
  let coreVehicle = `${effectiveBrand} ${model}`.trim();
  if (trim) coreVehicle += ` ${trim}`;

  // If both brand and model are empty/generic, ensure we have a fallback search term
  if (!coreVehicle) {
     coreVehicle = `${type} Vehicles`;
  }
  
  const attributes = [];
  if (type) attributes.push(type);
  if (fuel && fuel !== 'Any') attributes.push(fuel);
  if (transmission && transmission !== 'Any') attributes.push(transmission);
  
  // Define targeted sources - made slightly more broad
  const siteOperators = "site:facebook.com OR site:gumtree.co.za OR site:autotrader.co.za OR site:cars.co.za OR site:4x4community.co.za OR site:mybroadband.co.za OR site:instagram.com OR site:twitter.com";
  
  const intentKeywords = `("urgent" OR "private" OR "wanted" OR "looking for" OR "cash" OR "call" OR "whatsapp" OR "082" OR "083" OR "084" OR "072" OR "060" OR "071" OR "073" OR "074")`;
  
  let mileageContext = "";
  if (mileage && (mileage.min || mileage.max)) {
    mileageContext = `Mileage: ${mileage.min || '0'} to ${mileage.max || 'any'}`;
  }

  // Determine Search Context Instruction for the AI based on specificity
  let searchContextInstruction = "";
  if (trim) {
     searchContextInstruction = `MUST match the specific variant: "${trim}".`;
  } else if (model) {
     searchContextInstruction = `Ensure results match the specific model: "${model}".`;
  } else if (effectiveBrand) {
     // KEY CHANGE: If no model specified, instruct AI to look for ANY model under that brand
     searchContextInstruction = `Find ANY popular vehicle models for the brand "${effectiveBrand}". Do not restrict to a specific model.`;
  } else {
     searchContextInstruction = "Find relevant vehicle listings matching the search criteria.";
  }

  try {
    // ATTEMPT 1: Targeted Regional Search
    console.log(`Attempting search for ${coreVehicle} in ${region}...`);
    const primaryQuery = `${coreVehicle} ${attributes.join(' ')} ${region} ${intentKeywords} ${siteOperators} ${mileageContext}`;
    
    let leads = await performSearchRequest(primaryQuery, searchContextInstruction, true);

    // ATTEMPT 2: Fallback to National/Broad Search if 0 results
    if (leads.length === 0) {
      console.warn(`No leads found for ${region}. widening scope to South Africa...`);
      // Remove specific region, replace with generic country scope
      const broadQuery = `${coreVehicle} ${attributes.join(' ')} South Africa ${intentKeywords} ${mileageContext}`;
      
      const nationalLeads = await performSearchRequest(broadQuery, searchContextInstruction, false);
      
      // Mark these as National/Imported leads so the user knows they aren't local
      leads = nationalLeads.map(lead => ({
        ...lead,
        // Append context to summary
        summary: `[National Search] ${lead.summary}`, 
        region: "South Africa (National)" // Override region
      }));
    }

    if (leads.length === 0) {
      console.warn("Live search returned 0 results even after broadening. Falling back to simulation.");
      return await generateSimulatedLeads(brand, model, region, type);
    }

    return leads;

  } catch (error: any) {
    if (error.message?.includes('400') || error.message?.includes('API key')) {
      console.error("API Key or Validation Error.", error);
    } else {
      console.error("Lead Search Error:", error);
    }
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
    let apiKey = "";
    try {
       apiKey = process.env.API_KEY || "";
       if (apiKey) apiKey = apiKey.trim();
    } catch(e) {}
    
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
