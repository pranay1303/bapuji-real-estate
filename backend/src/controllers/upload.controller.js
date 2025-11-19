import supabase from "../utils/supabase.js";
import Property from "../models/property.model.js";

// ---------------------------------------
// UPLOAD IMAGES (max 5)
// ---------------------------------------
export const uploadPropertyImages = async (req, res) => {
  try {
    const propertyId = req.params.id;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No images uploaded" });
    }

    if (req.files.length > 5) {
      return res.status(400).json({ message: "Max 5 images allowed" });
    }

    const imageUrls = [];

    for (const file of req.files) {
      const fileName = `properties/${propertyId}/${Date.now()}_${file.originalname}`;

      const { error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
        });

      if (error) return res.status(500).json({ message: "Upload failed", error });

      const { data: urlData } = supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .getPublicUrl(fileName);

      imageUrls.push(urlData.publicUrl);
    }

    const updated = await Property.findByIdAndUpdate(
      propertyId,
      { $push: { images: { $each: imageUrls } } },
      { new: true }
    );

    res.json({
      message: "Images uploaded successfully",
      images: imageUrls,
      property: updated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------
// UPLOAD BROCHURE (PDF)
// ---------------------------------------
export const uploadBrochure = async (req, res) => {
  try {
    const propertyId = req.params.id;

    if (!req.file) {
      return res.status(400).json({ message: "No brochure uploaded" });
    }

    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ message: "Only PDF allowed" });
    }

    const fileName = `brochures/${propertyId}/${Date.now()}_${req.file.originalname}`;

    const { error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
      });

    if (error) return res.status(500).json({ message: "Upload failed", error });

    const { data: urlData } = supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .getPublicUrl(fileName);

    const updated = await Property.findByIdAndUpdate(
      propertyId,
      { brochureUrl: urlData.publicUrl },
      { new: true }
    );

    res.json({
      message: "Brochure uploaded successfully",
      brochureUrl: urlData.publicUrl,
      property: updated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------
// DELETE A SPECIFIC PROPERTY IMAGE
// ---------------------------------------
export const deletePropertyImage = async (req, res) => {
  try {
    const { id, imageIndex } = req.params;

    const property = await Property.findById(id);
    if (!property) return res.status(404).json({ message: "Property not found" });

    const imageUrl = property.images[imageIndex];
    if (!imageUrl) return res.status(400).json({ message: "Invalid image index" });

    // Extract Supabase file path
    const filePath = imageUrl.split("/property-files/")[1];

    const { error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .remove([filePath]);

    if (error) return res.status(500).json({ message: "Supabase delete failed", error });

    // Remove from DB
    property.images.splice(imageIndex, 1);
    await property.save();

    res.json({
      message: "Image deleted successfully",
      property,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------
// DELETE BROCHURE
// ---------------------------------------
export const deleteBrochure = async (req, res) => {
  try {
    const propertyId = req.params.id;

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });

    if (!property.brochureUrl) {
      return res.status(400).json({ message: "No brochure to delete" });
    }

    const filePath = property.brochureUrl.split("/property-files/")[1];

    const { error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .remove([filePath]);

    if (error) return res.status(500).json({ message: "Failed to delete", error });

    property.brochureUrl = "";
    await property.save();

    res.json({
      message: "Brochure deleted successfully",
      property,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
