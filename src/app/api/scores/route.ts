import { NextRequest, NextResponse } from "next/server";
import { saveScoresGranular } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { components, scores, bonusScores, gradeResults } = await req.json();
    const result = saveScoresGranular(components || [], scores || [], bonusScores || [], gradeResults || []);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in scores API:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
