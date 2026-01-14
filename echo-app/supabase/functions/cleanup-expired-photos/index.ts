// ============================================================
// Edge Function: Cleanup Expired Photos
// ============================================================
// Runs on a schedule (cron) to permanently delete photos from
// storage after their 3-minute viewing period expires.
// 
// This ensures photo privacy - once viewed, they're gone forever.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })

    // Find photos that have expired (view session ended)
    const { data: expiredPhotos, error: fetchError } = await supabase
      .from('photos')
      .select('id, storage_path, status, view_session_expires_at')
      .in('status', ['viewed', 'expired', 'approved'])
      .lt('view_session_expires_at', new Date().toISOString())
      .not('storage_path', 'is', null)

    if (fetchError) {
      console.error('Error fetching expired photos:', fetchError)
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!expiredPhotos || expiredPhotos.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No expired photos to clean up', deleted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${expiredPhotos.length} expired photos to delete`)

    let deletedCount = 0
    const errors: string[] = []

    // Delete each photo from storage
    for (const photo of expiredPhotos) {
      try {
        // Delete from storage bucket
        const { error: storageError } = await supabase.storage
          .from('echo-photos')
          .remove([photo.storage_path])

        if (storageError) {
          console.error(`Failed to delete storage for photo ${photo.id}:`, storageError)
          errors.push(`${photo.id}: ${storageError.message}`)
          continue
        }

        // Update photo record - clear storage path, mark as expired
        const { error: updateError } = await supabase
          .from('photos')
          .update({ 
            storage_path: null,
            signed_url: null,
            signed_url_expires_at: null,
            status: 'expired'
          })
          .eq('id', photo.id)

        if (updateError) {
          console.error(`Failed to update photo ${photo.id}:`, updateError)
          errors.push(`${photo.id}: ${updateError.message}`)
          continue
        }

        deletedCount++
        console.log(`Deleted photo ${photo.id} from storage`)

      } catch (err) {
        console.error(`Error processing photo ${photo.id}:`, err)
        errors.push(`${photo.id}: ${err.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        message: `Cleanup complete`,
        found: expiredPhotos.length,
        deleted: deletedCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Cleanup function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

