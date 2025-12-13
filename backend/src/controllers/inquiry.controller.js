import Inquiry from "../models/inquiry.model.js";

export const createInquiry = async (req, res) => {
  try {
    const { propertyId, userName, userPhone, message } = req.body;

    if (!propertyId || !message)
      return res.status(400).json({ message: "Missing required fields" });

    const inquiry = await Inquiry.create({
      property: propertyId,
      userName,
      userPhone,
      message
    });

    return res.status(201).json({ message: "Inquiry created", inquiry });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const replyInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

    inquiry.replies.push({ from: "admin", message: reply });
    inquiry.status = "replied";
    await inquiry.save();

    res.json({ message: "Reply added", inquiry });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const listInquiries = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const inquiries = await Inquiry.find(filter)
      .populate("property")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Inquiry.countDocuments(filter);

    res.json({ total, page, limit, inquiries });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// New: close an inquiry (set status = "closed")
export const closeInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const inquiry = await Inquiry.findById(id);
    if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

    inquiry.status = "closed";
    await inquiry.save();

    res.json({ message: "Inquiry closed", inquiry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};