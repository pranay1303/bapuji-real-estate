import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema({

  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    required: true
  },

  userName: { type: String, default: "" },
  userPhone: { type: String, default: "" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

  message: { type: String, required: true },

  status: {
    type: String,
    enum: ["pending", "replied", "closed"],
    default: "pending"
  },

  replies: [{
    from: { type: String, enum: ["user", "admin"] },
    message: String,
    createdAt: { type: Date, default: Date.now }
  }]

}, { timestamps: true });

export default mongoose.model("Inquiry", inquirySchema);
