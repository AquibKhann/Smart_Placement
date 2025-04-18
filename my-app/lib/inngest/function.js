import { db } from "@/lib/prisma";
import { inngest } from "./client";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const generateIndustryInsights = inngest.createFunction(
  { name: "Generate Industry Insights" },
  { cron: "0 0 * * 0" }, // Run every Sunday at midnight
  async ({ event, step }) => {
    const industries = await step.run("Fetch industries", async () => {
      return await db.industryInsight.findMany({
        select: { industry: true },
      });
    });

    for (const { industry } of industries) {
      for (const subIndustry of subIndustries) {
        const prompt = `
        You are an expert industry analyst.
        
        Analyze the current state of the "${subIndustry}" subindustry within the "${industry}" industry. 
        Generate insights that are **strictly limited to the ${subIndustry} subindustry only** — do NOT include data, roles, skills, or trends from other domains such as Artificial Intelligence, Machine Learning, Data Science, etc., unless ${subIndustry} explicitly overlaps with them.
        
        Return the data strictly in the following JSON format:
        {
          "salaryRanges": [
            { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
          ],
          "growthRate": number,
          "demandLevel": "High" | "Medium" | "Low",
          "topSkills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
          "marketOutlook": "Positive" | "Neutral" | "Negative",
          "keyTrends": ["trend1", "trend2", "trend3", "trend4", "trend5"],
          "recommendedSkills": ["skill1", "skill2", "skill3", "skill4", "skill5"]
        }
        
        IMPORTANT STRICT INSTRUCTIONS:
        - Include ONLY job roles that are common and specific to the "${subIndustry}" subindustry.
        - topSkills, keyTrends, and recommendedSkills must be **entirely relevant to the "${subIndustry}" subindustry**.
        - Do NOT include generic or irrelevant roles, skills, or trends from outside this subindustry.
        - Growth rate must be a percentage.
        - Output ONLY the JSON object. No extra comments or markdown.
        `;
        
        

      const res = await step.ai.wrap(
        "gemini",
        async (p) => {
          return await model.generateContent(p);
        },
        prompt
      );

      const text = res.response.candidates[0].content.parts[0].text || "";
      const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

      const insights = JSON.parse(cleanedText);

      await step.run(`Update ${industry} insights`, async () => {
        await db.industryInsight.update({
          where: { industry },
          data: {
            ...insights,
            lastUpdated: new Date(),
            nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      });
    }}
  }
);


