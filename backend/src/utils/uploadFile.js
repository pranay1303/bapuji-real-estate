// utils/uploadFile.js
import supabase from "./supabase.js";
import { v4 as uuidv4 } from "uuid";

/**
 * uploadFile(buffer, fileName, folder)
 * - uploads a file buffer to Supabase storage under `<folder>/<uuid>-<fileName>`
 * - returns { url, path } where:
 *    - url  = publicUrl (what you save in DB)
 *    - path = storage path inside the bucket (what you use to delete)
 */
export const uploadFile = async (fileBuffer, fileName, folder) => {
  try {
    const uniqueName = `${folder}/${uuidv4()}-${fileName}`;

    const { data, error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(uniqueName, fileBuffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: "application/octet-stream",
      });

    if (error) throw error;

    const publicUrl = supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .getPublicUrl(uniqueName).data.publicUrl;

    return { url: publicUrl, path: uniqueName };
  } catch (err) {
    console.log("Upload Error:", err.message || err);
    throw err;
  }
};

/**
 * deleteFile(pathOrPublicUrl)
 * - Accepts either:
 *     - the storage path (folder/uuid-filename.pdf) OR
 *     - the publicUrl returned by getPublicUrl
 * - Deletes the file from the configured bucket.
 */
export const deleteFile = async (pathOrPublicUrl) => {
  try {
    if (!pathOrPublicUrl) throw new Error("No path/url provided to deleteFile");

    // Extract path if a public URL was provided
    let path = pathOrPublicUrl;

    try {
      const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
      const prefix = `${supabaseUrl}/storage/v1/object/public/${process.env.SUPABASE_BUCKET}/`;
      if (pathOrPublicUrl.startsWith(prefix)) {
        path = pathOrPublicUrl.slice(prefix.length);
      } else {
        // Fallback: try to find /<bucket>/ in the URL and extract path after it
        const idx = pathOrPublicUrl.indexOf(`/${process.env.SUPABASE_BUCKET}/`);
        if (idx !== -1) {
          path = pathOrPublicUrl.slice(idx + (`/${process.env.SUPABASE_BUCKET}/`).length);
        }
      }
    } catch (e) {
      path = pathOrPublicUrl;
    }

    const { data, error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .remove([path]);

    if (error) {
      // throw so caller can handle/log
      throw error;
    }

    return data;
  } catch (err) {
    console.warn("deleteFile error:", err.message || err);
    throw err;
  }
};

export default uploadFile;
