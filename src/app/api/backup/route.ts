import { NextResponse } from "next/server";
import { backupDatabase } from "@/lib/db";
import fs from "fs";

export async function GET() {
  try {
    const backupFilePath = await backupDatabase();
    const fileBuffer = fs.readFileSync(backupFilePath);
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="graded-backup-${Date.now()}.db"`
      }
    });
  } catch (error: any) {
    console.error("Error creating database backup:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
