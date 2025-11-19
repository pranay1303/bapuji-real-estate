import mongoose from "mongoose";

const leadSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  phone: { type: String, required: true },
  email: { type: String, default: "" },

  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    required: true
  },

  action: {
    type: String,
    enum: ["download_brochure", "interested", "contacted"],
    required: true
  },

  source: { type: String, default: "web" },

}, { timestamps: true });

export default mongoose.model("Lead", leadSchema);
