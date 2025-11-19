import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

  userName: { type: String, default: "Anonymous" },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, default: "" },

  approved: { type: Boolean, default: false }

}, { timestamps: true });

export default mongoose.model("Review", reviewSchema);
