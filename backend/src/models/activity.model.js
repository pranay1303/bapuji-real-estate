import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  actorType: { type: String, enum: ["admin","system"] },
  action: { type: String }, // "create_property", "delete_brochure", etc
  meta: { type: Object, default: {} },
}, { timestamps: true });

export default mongoose.model("Activity", activitySchema);
