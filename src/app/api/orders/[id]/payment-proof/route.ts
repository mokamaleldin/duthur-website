import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, and PDF files are allowed.' },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds maximum limit of 5MB.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const filename = `${timestamp}_${safeName}`;
    let finalPath = '';

    // If Supabase service role key is available, attempt upload to storage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      try {
        const adminClient = createClient(supabaseUrl, serviceRoleKey);
        const storagePath = `${id}/${filename}`;
        const { error: uploadErr } = await adminClient.storage
          .from('payment-proofs')
          .upload(storagePath, buffer, {
            contentType: file.type,
            upsert: true,
          });

        if (!uploadErr) {
          finalPath = storagePath;
          await adminClient
            .from('orders')
            .update({
              payment_proof_path: storagePath,
              payment_proof_uploaded_at: new Date().toISOString(),
            })
            .eq('id', id);
        }
      } catch (err) {
        console.error('[Payment Proof] Supabase storage upload error:', err);
      }
    }

    // Fallback: save to local filesystem in public/uploads/payment-proofs
    if (!finalPath) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'payment-proofs');
      await fs.promises.mkdir(uploadDir, { recursive: true });
      const localFilename = `${id}_${filename}`;
      const localFilePath = path.join(uploadDir, localFilename);
      await fs.promises.writeFile(localFilePath, buffer);
      finalPath = `/uploads/payment-proofs/${localFilename}`;

      // Try updating the order row if possible
      try {
        const s = await createServerSupabase();
        await s
          .from('orders')
          .update({
            payment_proof_path: finalPath,
            payment_proof_uploaded_at: new Date().toISOString(),
          })
          .eq('id', id);
      } catch (dbErr) {
        console.warn('[Payment Proof] Order record update warning:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      path: finalPath,
    });
  } catch (err: any) {
    console.error('[Payment Proof API] Unhandled error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process payment proof upload.' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const s = await createServerSupabase();
    const { data: order } = await s
      .from('orders')
      .select('payment_proof_path')
      .eq('id', id)
      .single();

    if (!order?.payment_proof_path) {
      return NextResponse.json({ error: 'No proof found for this order' }, { status: 404 });
    }

    const proofPath = order.payment_proof_path;

    if (proofPath.startsWith('/')) {
      return NextResponse.redirect(new URL(proofPath, req.url));
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data } = await adminClient.storage
        .from('payment-proofs')
        .createSignedUrl(proofPath, 3600);

      if (data?.signedUrl) {
        return NextResponse.redirect(data.signedUrl);
      }
    }

    return NextResponse.json({ path: proofPath });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch proof' }, { status: 500 });
  }
}
