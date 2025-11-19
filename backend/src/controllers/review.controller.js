import Review from "../models/review.model.js";

export const addReview = async (req, res) => {
  try {
    const { propertyId, userId, userName, rating, comment } = req.body;

    if (!propertyId || !rating)
      return res.status(400).json({ message: "Missing required fields" });

    const review = await Review.create({
      property: propertyId,
      userId,
      userName,
      rating,
      comment,
      approved: false
    });

    res.status(201).json({ message: "Review submitted", review });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const listReviews = async (req, res) => {
  try {
    const { propertyId, approved, page = 1, limit = 20 } = req.query;

    const filter = {};

    if (propertyId) filter.property = propertyId;
    if (approved !== undefined) filter.approved = approved === "true";

    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(filter);

    res.json({ total, page, limit, reviews });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const moderateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { approve } = req.body;

    const review = await Review.findByIdAndUpdate(
      id,
      { approved: !!approve },
      { new: true }
    );

    res.json({ message: "Review updated", review });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
