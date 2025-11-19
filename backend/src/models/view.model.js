import mongoose from "mongoose";

const viewSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    required: true,
    unique: true
  },
  views: { type: Number, default: 0 },
  brochureDownloads: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("View", viewSchema);
