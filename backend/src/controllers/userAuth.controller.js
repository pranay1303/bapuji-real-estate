import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

//
// --------------------------
// USER REGISTRATION
// --------------------------
//
export const registerUser = async (req, res) => {
  try {
    const { name, username, email, mobile, password } = req.body;

    // Required fields
    if (!name || !email || !mobile || !password) {
      return res.status(400).json({ message: "All mandatory fields required" });
    }

    // Check if already exists
    const emailExists = await User.findOne({ email });
    if (emailExists)
      return res.status(400).json({ message: "Email already registered" });

    const mobileExists = await User.findOne({ mobile });
    if (mobileExists)
      return res.status(400).json({ message: "Mobile number already registered" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      username,
      email,
      mobile,
      password: hashedPassword,
      isVerified: true, // For now: auto-verified
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        username: user.username,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//
// --------------------------
// USER LOGIN
// --------------------------
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate fields
    if (!email || !password)
      return res.status(400).json({ message: "Email & Password required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    // Reject blocked users
    if (user.isActive === false) {
      return res.status(403).json({ message: "Account blocked. Contact support." });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Incorrect password" });

    // Create JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
