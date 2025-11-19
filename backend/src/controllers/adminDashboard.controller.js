import Property from "../models/property.model.js";
import Admin from "../models/admin.model.js";
import Lead from "../models/lead.model.js";
import Inquiry from "../models/inquiry.model.js";
import Review from "../models/review.model.js";
import View from "../models/view.model.js";

export const getAdminDashboardStats = async (req, res) => {
  try {
    // ---------- PROPERTY STATS ----------
    const totalProperties = await Property.countDocuments();
    const available = await Property.countDocuments({ status: "Available" });
    const sold = await Property.countDocuments({ status: "Sold" });
    const upcoming = await Property.countDocuments({ status: "Upcoming" });

    const allProperties = await Property.find({}, "images brochureUrl");
    let totalImages = 0;
    let totalBrochures = 0;

    allProperties.forEach((p) => {
      totalImages += p.images.length;
      if (p.brochureUrl) totalBrochures++;
    });

    // ---------- ADMIN STATS ----------
    const totalAdmins = await Admin.countDocuments();

    // ---------- LEAD STATS ----------
    const totalLeads = await Lead.countDocuments();

    const brochureDownloads = await Lead.countDocuments({
      action: "download_brochure"
    });

    const propertyInterests = await Lead.countDocuments({
      action: "interested"
    });

    // verified leads: when OTP system is implemented
    const verifiedLeads = 0;

    // ---------- INQUIRY STATS ----------
    const totalInquiries = await Inquiry.countDocuments();
    const pendingInquiries = await Inquiry.countDocuments({ status: "pending" });

    // ---------- REVIEW STATS ----------
    const approvedReviews = await Review.countDocuments({ approved: true });

    // ---------- VIEWS & DOWNLOAD STATS ----------
    const totalViews = await View.aggregate([
      { $group: { _id: null, sum: { $sum: "$views" } } }
    ]);

    const totalBrochureDownloadsTracked = await View.aggregate([
      { $group: { _id: null, sum: { $sum: "$brochureDownloads" } } }
    ]);

    // ---------- FINAL RESPONSE ----------
    res.json({
      properties: {
        total: totalProperties,
        available,
        sold,
        upcoming,
        totalImagesUploaded: totalImages,
        totalBrochuresUploaded: totalBrochures,
      },

      admins: { totalAdmins },

      leads: {
        totalLeads,
        verifiedLeads,
        brochureDownloads,
        propertyInterests,
      },

      inquiries: {
        totalInquiries,
        pendingInquiries,
      },

      reviews: {
        approvedReviews,
      },

      traffic: {
        totalViews:
          totalViews.length > 0 ? totalViews[0].sum : 0,
        brochureDownloadsTracked:
          totalBrochureDownloadsTracked.length > 0
            ? totalBrochureDownloadsTracked[0].sum
            : 0,
      },
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
