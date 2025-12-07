
import { GoogleGenAI } from "@google/genai";
import { MarketInsight } from "../types";

const getAiClient = () => {
  // Check both common naming conventions for the key
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key not found");
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
  
  // Construct specific vehicle string
  let vehicleQuery = `${type} ${brand} ${model}`;
  if (trim) vehicleQuery += ` ${trim}`;
  if (fuel && fuel !== 'Any') vehicleQuery += ` ${fuel}`;
  if (transmission && transmission !== 'Any') vehicleQuery += ` ${transmission}`;

  // Construct mileage context
  let mileageContext = "";
  if (mileage && (mileage.min || mileage.max)) {
    mileageContext = `Mileage preference: ${mileage.min || '0'}km to ${mileage.max || 'any'}km.`;
  }

  const prompt = `
    I need to find potential vehicle sales leads for a dealership in South Africa.
    Search for recent (last 30 days) classified listings, forum discussions (e.g. 4x4community, mybroadband), or public social media posts for:
    Vehicle: ${vehicleQuery}
    Location: ${region}, South Africa
    ${mileageContext}
    
    Goal: Identify people looking to BUY. 
    ${trim ? `CRITICAL: The buyer must be looking for the specific trim/variant: "${trim}". Filter out results that are the base model if this spec is requested.` : ''}
    
    SPECIAL INSTRUCTION: Analyze the Source URL and Snippet carefully to identify the SPECIFIC Platform.
    - If it's a Facebook URL, try to detect if it is a "Marketplace Listing" or a specific "Facebook Group" (e.g., VW Club SA).
    - Differentiate between "AutoTrader", "Cars.co.za", "Gumtree", "WeBuyCars".
    - Identify if it is a "WhatsApp Community" invite or discussion.
    
    Analyze the search results. For each relevant lead found, extract the following information.
    If specific contact details (Name, Phone, Email) are visible in the snippet or title, extract them.

    STRICTLY FORMAT THE OUTPUT as a list where each item is separated by "---LEAD_ITEM---".
    Inside each item use these exact keys:
    Topic: [Short Title]
    Sentiment: [If User is looking to BUY a USED vehicle, set to "HOT". Else "Warm" or "Cold"]
    Summary: [1 sentence summary of intent including specs found]
    SourceTitle: [Website Name]
    SourceURI: [The URL]
    SourcePlatform: [The specific platform type e.g., "Facebook Group", "Facebook Marketplace", "4x4Community Forum", "AutoTrader Listing"]
    ContextDealer: [If a specific dealer name is mentioned in the snippet, extract it. Else "N/A"]
    ContactName: [Extracted Name or "N/A"]
    ContactPhone: [Extracted Phone Number or "N/A"]
    ContactEmail: [Extracted Email Address or "N/A"]
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

export const generateMarketingVideo = async (
  prompt: string,
  resolution: '1080p' | '720p',
  aspectRatio: '16:9' | '9:16'
): Promise<string | null> => {
    const ai = getAiClient();
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

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

    const lead: any = {
      topic: extractValue(part, "Topic"),
      sentiment: extractValue(part, "Sentiment"),
      summary: extractValue(part, "Summary"),
      sources: [{
        title: extractValue(part, "SourceTitle") || "Unknown Source",
        uri: extractValue(part, "SourceURI") || "#"
      }],
      sourcePlatform: extractValue(part, "SourcePlatform"),
      contextDealer: extractValue(part, "ContextDealer"),
      extractedContact: {
        name: extractValue(part, "ContactName") !== "N/A" ? extractValue(part, "ContactName") : undefined,
        phone: extractValue(part, "ContactPhone") !== "N/A" ? extractValue(part, "ContactPhone") : undefined,
        email: extractValue(part, "ContactEmail") !== "N/A" ? extractValue(part, "ContactEmail") : undefined
      }
    };

    if (lead.topic) {
      leads.push(lead as MarketInsight);
    }
  }
  return leads;
};

const extractValue = (text: string, key: string): string => {
  const regex = new RegExp(`${key}:\\s*(.*)`, "i");
  const match = text.match(regex);
  return match ? match[1].trim() : "";
};
