import { NextResponse } from "next/server";

export type AgreementArticle = { title: string; body: string };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  let backendUrl = "http://auth-api.customer.svc.cluster.local:8080/api/auth/agreements";
  if (type) {
    backendUrl += `?type=${type}`;
  }

  try {
    const res = await fetch(backendUrl, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to fetch agreements from backend");
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching agreements:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
