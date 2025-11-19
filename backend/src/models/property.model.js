import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },

    location: { type: String, required: true },
    city: { type: String, required: true },

    price: { type: Number, required: true },
    category: { type: String, enum: ["1BHK", "2BHK", "3BHK", "Plot", "Villa", "Commercial"], required: true },

    amenities: [{ type: String }],

    images: [{ type: String }],               // image URLs from Firebase
    brochureUrl: { type: String },            // PDF URL

    status: { type: String, enum: ["Available", "Sold Out", "Upcoming"], default: "Available" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Property", propertySchema);
