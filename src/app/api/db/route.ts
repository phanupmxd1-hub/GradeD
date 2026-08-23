import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const { loadAllDataFromDb } = await import("@/lib/db");
    const data = loadAllDataFromDb();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.warn("SQLite database not available on serverless/cloud environment:", error?.message);
    return NextResponse.json({ 
      success: false, 
      isServerless: true, 
      message: "SQLite not supported in serverless environment, using Supabase or fallback." 
    }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { saveAllDataToDb } = await import("@/lib/db");
    const result = saveAllDataToDb(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.warn("SQLite database write not available on serverless/cloud environment:", error?.message);
    return NextResponse.json({ 
      success: false, 
      isServerless: true, 
      message: "SQLite not supported in serverless environment, using Supabase or fallback." 
    }, { status: 200 });
  }
}
