// controllers/property.controller.js
import Property from "../models/property.model.js";
import { uploadFile, deleteFile } from "../utils/uploadFile.js";

// =====================================================
// ✅ 1. CREATE PROPERTY
// =====================================================
export const createProperty = async (req, res) => {
  try {
    const { title, description, location, city, price, category, amenities } = req.body;

    const newProperty = await Property.create({
      title,
      description,
      location,
      city,
      price,
      category,
      amenities,
      images: [],       // will update after upload
      brochureUrl: "",  // will update after upload
      createdBy: req.user?.id || null,
    });

    res.json({
      message: "Property created successfully",
      property: newProperty,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// =====================================================
// ✅ 2. GET ALL PROPERTIES
// =====================================================
export const getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find().sort({ createdAt: -1 });
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// =====================================================
// ✅ 3. GET PROPERTY BY ID
// =====================================================
export const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: "Property not found" });
    res.json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// =====================================================
// ✅ 4. UPDATE PROPERTY
// =====================================================
export const updateProperty = async (req, res) => {
  try {
    const updated = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Property not found" });

    res.json({
      message: "Property updated successfully",
      property: updated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// =====================================================
// ✅ 5. DELETE PROPERTY
// =====================================================
export const deleteProperty = async (req, res) => {
  try {
    const deleted = await Property.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Property not found" });

    // Attempt to delete files from Supabase if paths/urls present
    try {
      if (Array.isArray(deleted.images)) {
        for (const url of deleted.images) {
          try { await deleteFile(url); } catch (e) { console.warn("Failed to delete image:", e.message || e); }
        }
      }
      if (deleted.brochureUrl) {
        try { await deleteFile(deleted.brochureUrl); } catch (e) { console.warn("Failed to delete brochure:", e.message || e); }
      }
    } catch (e) {
      console.warn("Error during storage cleanup:", e.message || e);
    }

    res.json({ message: "Property deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// =====================================================
// ✅ Upload Property Images (multiple)
// =====================================================
export const uploadPropertyImages = async (req, res) => {
  try {
    const files = req.files;
    const propertyId = req.params.id;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const uploadedUrls = [];
    const uploadedPaths = [];
    for (const file of files) {
      const { url, path } = await uploadFile(file.buffer, file.originalname, "images");
      uploadedUrls.push(url);
      uploadedPaths.push(path);
    }

    // push the uploaded URLs into the property.images array
    await Property.findByIdAndUpdate(propertyId, { $push: { images: { $each: uploadedUrls } } });

    res.json({
      message: "Images uploaded successfully",
      urls: uploadedUrls,
      paths: uploadedPaths,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// =====================================================
// ✅ Upload Brochure (single)
// =====================================================
export const uploadBrochure = async (req, res) => {
  try {
    const file = req.file;
    const propertyId = req.params.id;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { url, path } = await uploadFile(file.buffer, file.originalname, "brochures");

    await Property.findByIdAndUpdate(propertyId, { brochureUrl: url });

    res.json({
      message: "Brochure uploaded successfully",
      url,
      path,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// =====================================================
// ✅ DELETE an existing property image by index
//  DELETE /api/properties/:id/images/:imageIndex
// =====================================================
export const deletePropertyImage = async (req, res) => {
  try {
    const { id, imageIndex } = req.params;
    const idx = Number(imageIndex);
    if (Number.isNaN(idx)) return res.status(400).json({ message: "Invalid image index" });

    const property = await Property.findById(id);
    if (!property) return res.status(404).json({ message: "Property not found" });

    if (!Array.isArray(property.images) || property.images.length === 0) {
      return res.status(400).json({ message: "No images to delete" });
    }

    if (idx < 0 || idx >= property.images.length) {
      return res.status(400).json({ message: "Image index out of range" });
    }

    const [removedUrl] = property.images.splice(idx, 1);

    // save property
    await property.save();

    // attempt to delete from Supabase storage (silent failure allowed)
    try {
      await deleteFile(removedUrl);
    } catch (err) {
      console.warn("Failed to delete image from storage:", err.message || err);
    }

    return res.json({ message: "Image removed", url: removedUrl, images: property.images });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// =====================================================
// ✅ DELETE brochure
//  DELETE /api/properties/:id/brochure
// =====================================================
export const deleteBrochure = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findById(id);
    if (!property) return res.status(404).json({ message: "Property not found" });

    const previous = property.brochureUrl || "";

    property.brochureUrl = "";
    await property.save();

    // attempt to delete from Supabase storage (silent failure allowed)
    try {
      if (previous) await deleteFile(previous);
    } catch (err) {
      console.warn("Failed to delete brochure from storage:", err.message || err);
    }

    return res.json({ message: "Brochure removed", previous });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
