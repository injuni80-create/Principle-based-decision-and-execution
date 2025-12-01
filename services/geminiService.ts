import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Principle, RelevantPrinciple } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please ensure process.env.API_KEY is available.");
  }
  return new GoogleGenAI({ apiKey });
};

// Phase 1: Analyze situation and select principles
export const analyzeSituation = async (
  situation: string,
  principles: Principle[]
): Promise<RelevantPrinciple[]> => {
  const ai = getAiClient();
  const modelId = "gemini-2.5-flash"; // Good balance of speed and reasoning

  const principlesContext = principles
    .map((p) => `ID: ${p.id}\n제목: ${p.title}\n설명: ${p.description}`)
    .join("\n---\n");

  const prompt = `
    당신은 지혜로운 멘토입니다. 사용자가 아래와 같은 결정 상황에 처해 있습니다.
    사용자의 '10가지 인생 원칙'을 참고하여 도움을 주어야 합니다.
    
    작업:
    1. 사용자의 상황을 분석하세요.
    2. 이 상황과 가장 관련이 깊은 원칙 3~4가지를 선택하세요.
    3. 선택된 각 원칙에 대해, 사용자가 자신의 선택이 해당 원칙에 부합하는지 스스로 돌아볼 수 있는 깊이 있는 '성찰 질문'을 생성하세요. (예: "이 선택이 당신의 장기적인 성장에 도움이 됩니까?")
    
    모든 답변(성찰 질문 등)은 반드시 **한국어**로 작성해야 합니다.

    사용자 상황: "${situation}"

    사용자의 원칙:
    ${principlesContext}
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      analysis: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            principleId: { type: Type.STRING, description: "제공된 목록에서 선택한 관련 원칙의 ID" },
            reflectionQuestion: { type: Type.STRING, description: "사용자가 상황에 비추어 이 원칙을 깊이 있게 성찰할 수 있도록 돕는 구체적인 질문 (한국어)" }
          },
          required: ["principleId", "reflectionQuestion"]
        }
      }
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.3, 
      },
    });

    const result = JSON.parse(response.text || "{}");
    
    // Map back to full principle objects
    const mapped: RelevantPrinciple[] = [];
    if (result.analysis && Array.isArray(result.analysis)) {
        for (const item of result.analysis) {
            const original = principles.find(p => p.id === item.principleId);
            if (original) {
                mapped.push({
                    principleId: original.id,
                    principleTitle: original.title,
                    principleDescription: original.description,
                    reflectionQuestion: item.reflectionQuestion
                });
            }
        }
    }
    return mapped;

  } catch (error) {
    console.error("Error analyzing situation:", error);
    throw new Error("상황 분석에 실패했습니다. 다시 시도해주세요.");
  }
};

// Phase 2: Synthesize answers and provide advice
export const synthesizeAdvice = async (
  situation: string,
  reflections: RelevantPrinciple[]
): Promise<string> => {
  const ai = getAiClient();
  const modelId = "gemini-2.5-flash";

  const reflectionContext = reflections
    .map(
      (r) =>
        `원칙: ${r.principleTitle}\n질문: ${r.reflectionQuestion}\n사용자 답변: ${r.userAnswer}`
    )
    .join("\n---\n");

  const prompt = `
    당신은 지혜롭고 따뜻하며 단호한 멘토입니다.
    
    사용자가 처한 상황: "${situation}"
    
    사용자는 자신의 원칙에 대해 다음과 같이 성찰하고 답변했습니다:
    ${reflectionContext}
    
    작업:
    사용자의 답변과 원칙을 바탕으로 최종 조언을 제공하세요.
    1. 갈등이나 문제를 간략히 요약하세요.
    2. 원칙이 이 상황에서 어떻게 적용되어야 하는지 설명하세요.
    3. 따뜻하지만 단호한 어조로, 사용자가 나아가야 할 최선의 방향을 명확하게 제안하세요.
    
    Markdown 헤더를 과도하게 사용하지 말고, 편지나 말로 전하는 조언처럼 자연스럽게 작성하세요. 
    반드시 **한국어**로 작성하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        // Text output is fine for the final advice
        temperature: 0.5,
      },
    });

    return response.text || "현재 조언을 생성할 수 없습니다.";
  } catch (error) {
    console.error("Error synthesizing advice:", error);
    throw new Error("조언 생성에 실패했습니다.");
  }
};