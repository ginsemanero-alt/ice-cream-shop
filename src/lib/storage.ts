import { requireSupabase } from './supabase'

const BUCKET = 'store-assets'
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

/** Upload an image to Supabase Storage (admin only, enforced by storage RLS) and return its public URL. */
export async function uploadImage(file: File, folder: string): Promise<string> {
  if (!ALLOWED.includes(file.type)) throw new Error('Please choose a JPG, PNG or WebP image.')
  if (file.size > MAX_BYTES) throw new Error('Image must be 5 MB or smaller.')
  const sb = requireSupabase()
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000' })
  if (error) throw error
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
