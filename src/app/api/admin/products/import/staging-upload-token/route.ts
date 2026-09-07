import { NextResponse } from "next/server";
export const runtime="nodejs";
export async function POST(){return NextResponse.json({ok:false,message:"Product Import ZIP sekarang memakai local chunk staging."},{status:410,headers:{"Cache-Control":"no-store"}});}
