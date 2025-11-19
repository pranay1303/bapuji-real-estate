import Lead from "../models/lead.model.js";
import View from "../models/view.model.js";

export const createLead = async (req, res) => {
  try {
    const { phone, name, email, propertyId, action, source } = req.body;

    if (!phone || !propertyId || !action) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const lead = await Lead.create({
      phone, name, email,
      property: propertyId,
      action,
      source
    });

    if (action === "download_brochure") {
      await View.findOneAndUpdate(
        { property: propertyId },
        { $inc: { brochureDownloads: 1 } },
        { upsert: true, new: true }
      );
    }

    return res.status(201).json({ message: "Lead created", lead });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const listLeads = async (req, res) => {
  try {
    const { propertyId, from, to, page = 1, limit = 20 } = req.query;

    const filter = {};

    if (propertyId) filter.property = propertyId;
    if (from || to) filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);

    const leads = await Lead.find(filter)
      .populate("property")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Lead.countDocuments(filter);

    res.json({ total, page, limit, leads });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
