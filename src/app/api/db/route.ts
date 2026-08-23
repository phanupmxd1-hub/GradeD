import { NextRequest, NextResponse } from "next/server";
import { loadAllDataFromDb, saveAllDataToDb } from "@/lib/db";

export async function GET() {
  try {
    const data = loadAllDataFromDb();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error loading SQLite data:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = saveAllDataToDb(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error saving to SQLite database:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
