import View from "../models/view.model.js";

export const incrementView = async (req, res) => {
  try {
    const propertyId = req.params.id;

    const doc = await View.findOneAndUpdate(
      { property: propertyId },
      { $inc: { views: 1 } },
      { upsert: true, new: true }
    );

    res.json({ message: "View counted", views: doc.views });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const incrementDownload = async (req, res) => {
  try {
    const propertyId = req.params.id;

    const doc = await View.findOneAndUpdate(
      { property: propertyId },
      { $inc: { brochureDownloads: 1 } },
      { upsert: true, new: true }
    );

    res.json({ message: "Download counted", brochureDownloads: doc.brochureDownloads });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getTopProperties = async (req, res) => {
  try {
    const top = await View.find()
      .sort({ views: -1 })
      .limit(10)
      .populate("property");

    res.json({ top });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
