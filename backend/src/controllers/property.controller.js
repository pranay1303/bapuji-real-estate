import Property from "../models/property.model.js";
import { uploadFile } from "../utils/uploadFile.js";

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
      createdBy: req.user.id,
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
// ❌ DELETE PROPERTY
// =====================================================
export const deleteProperty = async (req, res) => {
  try {
    const deleted = await Property.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Property not found" });

    res.json({ message: "Property deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// =====================================================
// 📌 EXTRA FUNCTIONS — UPLOAD IMAGES & BROCHURE
// =====================================================

// ✅ Upload Property Images (multiple)
export const uploadPropertyImages = async (req, res) => {
  try {
    const files = req.files;
    const propertyId = req.params.id;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const uploadedUrls = [];
    for (const file of files) {
      const url = await uploadFile(file.buffer, file.originalname, "images");
      uploadedUrls.push(url);
    }

    await Property.findByIdAndUpdate(propertyId, { $push: { images: { $each: uploadedUrls } } });

    res.json({
      message: "Images uploaded successfully",
      urls: uploadedUrls,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// ✅ Upload Brochure (single)
export const uploadBrochure = async (req, res) => {
  try {
    const file = req.file;
    const propertyId = req.params.id;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const url = await uploadFile(file.buffer, file.originalname, "brochures");

    await Property.findByIdAndUpdate(propertyId, { brochureUrl: url });

    res.json({
      message: "Brochure uploaded successfully",
      url,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
