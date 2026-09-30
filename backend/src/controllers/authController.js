const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const toUser = user => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  organizationName: user.organizationName,
  skills: user.skills,
  available: user.available,
  location: user.location
});

const createToken = user =>
  jwt.sign(
    {
      id: user._id,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      skills,
      coordinates,
      organizationName
    } = req.body;

    const allowedRoles = ["CITIZEN", "VOLUNTEER", "NGO"];
    const safeRole = role || "CITIZEN";
    if (!allowedRoles.includes(safeRole)) return res.status(403).json({ success: false, message: "Authority accounts are provisioned by the response administrator" });

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    if (role === "NGO" && !organizationName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Organization name is required for NGO accounts"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: safeRole,
      phone,
      organizationName: safeRole === "NGO" ? organizationName.trim() : undefined,
      skills: skills || [],
      available: safeRole === "VOLUNTEER",
      location: {
        type: "Point",
        coordinates: coordinates || [78.4867, 17.385]
      }
    });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token: createToken(user),
      user: toUser(user)
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const valid = await bcrypt.compare(
      password,
      user.password
    );

    if (!valid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    res.json({
      success: true,
      message: "Login successful",
      token: createToken(user),
      user: toUser(user)
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

module.exports = {
  register,
  login
};