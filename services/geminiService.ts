
import { GoogleGenAI, Type } from "@google/genai";
import { Material, AIStyleConfig } from "../types";

/**
 * Generates a seamless texture using Gemini 2.5 Flash Image capabilities.
 */
export const generateTexture = async (prompt: string): Promise<Material | null> => {
  try {
    // Initializing Gemini client within the function to ensure it uses the correct environment API key.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const texturePrompt = `High quality, seamless texture pattern of ${prompt}. Flat lighting, top down view, filling the frame. 2k resolution.`;
    // Use gemini-2.5-flash-image for general image generation tasks.
    const model = 'gemini-2.5-flash-image'; 
    
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: texturePrompt }]
      },
    });

    if (!response || !response.candidates) return null;

    let base64Image: string | null = null;
    if (response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
         if (part.inlineData) {
            base64Image = part.inlineData.data || null;
            break;
         }
      }
    }

    const finalTextureUrl = base64Image 
      ? `data:image/png;base64,${base64Image}` 
      : `https://picsum.photos/seed/${Math.random()}/512/512`;

    const newMaterial: Material = {
      id: `ai-${Date.now()}`,
      name: `AI: ${prompt}`,
      color: '#ffffff',
      roughness: 0.5,
      metalness: 0.1,
      type: 'ai-generated',
      textureUrl: finalTextureUrl
    };

    return newMaterial;

  } catch (error) {
    console.error("Error generating texture:", error);
    return null;
  }
};

/**
 * Generates a full styling configuration for the shoe based on a theme prompt.
 * Returns a list of style configs for each part ID provided.
 */
export const generateShoeConfig = async (prompt: string, parts: string[]): Promise<AIStyleConfig[] | null> => {
  try {
    // Initializing Gemini client within the function to ensure the correct API key is used.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      // Use gemini-3-pro-preview for complex reasoning tasks like full design generation.
      model: 'gemini-3-pro-preview',
      contents: `Create a cohesive color and material design for a shoe based on the theme: "${prompt}". 
                 The shoe has these parts: ${parts.join(', ')}. 
                 
                 Return a list of material specifications for each part to match the theme.
                 
                 IMPORTANT:
                 - Provide a 'texturePrompt' describing the visual surface pattern (e.g. 'seamless red carbon fiber texture', 'worn brown leather texture') for image generation.
                 - If parts share the SAME material (e.g. Left and Right upper), use the EXACT SAME 'texturePrompt' and 'materialName' so we can reuse the generated texture.
                 - If a texture is used, set 'color' to '#ffffff' to ensure the texture renders with its original colors, unless you specifically want to tint it.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            design: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  partId: { type: Type.STRING },
                  color: { type: Type.STRING, description: "Hex color code. Use #ffffff if texturePrompt is provided to avoid tinting, unless tint is desired." },
                  roughness: { type: Type.NUMBER, description: "0.0 (smooth) to 1.0 (rough)" },
                  metalness: { type: Type.NUMBER, description: "0.0 (non-metal) to 1.0 (metallic)" },
                  materialName: { type: Type.STRING, description: "Creative name for the material" },
                  texturePrompt: { type: Type.STRING, description: "Prompt to generate a seamless texture image for this material." }
                },
                required: ["partId", "color", "roughness", "metalness", "materialName", "texturePrompt"]
              }
            }
          }
        }
      }
    });

    if (!response) return null;

    // Directly access the text property as per guidelines (not a method).
    if (response.text) {
        try {
          const data = JSON.parse(response.text);
          // Safety check: ensure data and data.design exist before accessing
          if (data && typeof data === 'object' && data.design) {
            return data.design;
          }
          return null;
        } catch (e) {
          console.error("Failed to parse JSON", e);
          return null;
        }
    }
    return null;
  } catch (error) {
    console.error("AI Config Gen Error:", error);
    return null;
  }
};
