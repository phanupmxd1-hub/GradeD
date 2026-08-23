import { NextRequest, NextResponse } from "next/server";
import { saveAttendanceGranular } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { sessions, records } = await req.json();
    const result = saveAttendanceGranular(sessions || [], records || []);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in attendance API:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
