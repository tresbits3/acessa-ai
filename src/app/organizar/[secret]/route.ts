import { NextRequest, NextResponse } from 'next/server';
import { adminCookie, makeSession } from '@/lib/admin';
import { longSecret } from '@/lib/config';
import { safeEqual } from '@/lib/identity';
export async function GET(request:NextRequest,{params}:{params:Promise<{secret:string}>}){
  const {secret}=await params;
  if(secret.length<32 || !safeEqual(secret,longSecret('ADMIN_LINK_SECRET'))) return new Response('Link inválido',{status:404});
  const response=NextResponse.redirect(new URL('/admin',request.url),303);
  response.cookies.set(adminCookie(),makeSession(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:7*86400});
  response.headers.set('Referrer-Policy','no-referrer'); response.headers.set('Cache-Control','no-store');
  return response;
}
