import supabase from "./supabase.js";
import { v4 as uuidv4 } from "uuid";

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

    return publicUrl;
  } catch (err) {
    console.log("Upload Error:", err.message);
    throw err;
  }
};
