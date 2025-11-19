import User from "../models/user.model.js";
import Property from "../models/property.model.js";
import View from "../models/view.model.js";
import Lead from "../models/lead.model.js";
import Inquiry from "../models/inquiry.model.js";
import Review from "../models/review.model.js";

// GET profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// UPDATE profile
export const updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    // prevent role/isVerified updates by user
    delete updates.role;
    delete updates.isVerified;
    delete updates.password; // password change should be separate

    const updated = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select("-password");
    res.json({ message: "Profile updated", user: updated });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// SAVE property (add to wishlist)
export const saveProperty = async (req, res) => {
  try {
    const uid = req.user.id;
    const pid = req.params.id;

    const user = await User.findById(uid);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.savedProperties.includes(pid)) {
      return res.status(400).json({ message: "Property already saved" });
    }

    user.savedProperties.unshift(pid); // add to start
    await user.save();

    res.json({ message: "Property saved", savedProperties: user.savedProperties });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// UNSAVE property
export const unsaveProperty = async (req, res) => {
  try {
    const uid = req.user.id;
    const pid = req.params.id;

    const user = await User.findById(uid);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.savedProperties = user.savedProperties.filter((p) => p.toString() !== pid);
    await user.save();

    res.json({ message: "Property removed from saved", savedProperties: user.savedProperties });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// LIST saved properties (populated)
export const listSaved = async (req, res) => {
  try {
    const uid = req.user.id;
    const user = await User.findById(uid).populate({
      path: "savedProperties",
      options: { sort: { createdAt: -1 } }
    });
    res.json({ saved: user.savedProperties || [] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Add recent view (keeps last 10) and increments global view counter
export const addRecentView = async (req, res) => {
  try {
    const uid = req.user ? req.user.id : null;
    const pid = req.params.id;

    // increment global view count
    await View.findOneAndUpdate(
      { property: pid },
      { $inc: { views: 1 } },
      { upsert: true, new: true }
    );

    if (!uid) return res.json({ message: "View counted (guest)", views: true });

    const user = await User.findById(uid);
    if (!user) return res.status(404).json({ message: "User not found" });

    // remove existing occurrence
    user.recentViews = user.recentViews.filter((x) => x.toString() !== pid);
    user.recentViews.unshift(pid);
    // keep only last 10
    if (user.recentViews.length > 10) user.recentViews = user.recentViews.slice(0, 10);
    await user.save();

    res.json({ message: "View counted & recent updated", recent: user.recentViews });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// User dashboard
export const getUserDashboard = async (req, res) => {
  try {
    const uid = req.user.id;

    const user = await User.findById(uid)
      .select("-password")
      .populate("savedProperties")
      .populate("recentViews");

    const savedCount = user.savedProperties ? user.savedProperties.length : 0;
    const recent = user.recentViews || [];

    const leadsCount = await Lead.countDocuments({ phone: user.mobile });
    const inquiriesCount = await Inquiry.countDocuments({ userId: uid });
    const reviewsCount = await Review.countDocuments({ userId: uid });

    // brochure downloads tracked in View by property and via Lead, get downloads by user email/phone:
    const brochureDownloads = await Lead.countDocuments({ phone: user.mobile, action: "download_brochure" });

    res.json({
      profile: user,
      stats: { savedCount, recentCount: recent.length, leadsCount, inquiriesCount, reviewsCount, brochureDownloads },
      savedProperties: user.savedProperties,
      recentViews: user.recentViews
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
