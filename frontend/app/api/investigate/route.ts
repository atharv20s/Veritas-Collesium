import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = `sentinel-inv-${Date.now()}`;
    
    // In a real app we'd save the investigation params to a DB
    return NextResponse.json({ investigation_id: id });
  } catch (err) {
    return NextResponse.json({ error: "Failed to parse request" }, { status: 400 });
  }
}
