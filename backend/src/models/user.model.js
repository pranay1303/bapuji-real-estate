import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    username: { type: String, unique: true },

    email: { type: String, unique: true, required: true },

    mobile: { type: String, unique: true, required: true },

    password: { type: String, required: true },

    profileImage: { type: String, default: "" },

    savedProperties: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Property" }
    ],

    recentViews: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Property" }
    ],

    preferences: {
      city: { type: String, default: "" },
      minBudget: { type: Number, default: 0 },
      maxBudget: { type: Number, default: 0 },
      bhk: { type: String, default: "" },
    },

    role: { type: String, default: "user" }, // future: user / agent

    isVerified: { type: Boolean, default: false },

    lastLogin: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
