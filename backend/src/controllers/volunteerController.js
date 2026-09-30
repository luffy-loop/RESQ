const User = require("../models/User");

const createVolunteer = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      skills,
      longitude,
      latitude
    } = req.body;

    const volunteer = await User.create({
      name,
      email,
      password,
      role: "VOLUNTEER",
      phone,
      skills,
      available: true,
      location: {
        type: "Point",
        coordinates: [longitude, latitude]
      }
    });

    const result = volunteer.toObject();
    delete result.password;

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getVolunteers = async (req, res) => {
  try {
    const volunteers = await User.find({
      role: "VOLUNTEER"
    }).select("-password");

    res.json(volunteers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateVolunteerLocation = async (req, res) => {
  try {
    const { longitude, latitude } = req.body;

    if (
      typeof longitude !== "number" ||
      typeof latitude !== "number" ||
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90
    ) {
      return res.status(400).json({
        message: "Valid coordinates are required"
      });
    }

    const volunteer = await User.findOneAndUpdate(
      { _id: req.params.id, role: "VOLUNTEER" },
      {
        location: {
          type: "Point",
          coordinates: [longitude, latitude]
        }
      },
      {
        new: true,
        runValidators: true
      }
    ).select("-password");

    if (!volunteer) {
      return res.status(404).json({
        message: "Volunteer not found"
      });
    }

    res.json(volunteer);
  } catch (err) {
    res.status(400).json({
      message: err.message
    });
  }
};

const updateVolunteerAvailability = async (req, res) => {
  try {
    const volunteer = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        role: "VOLUNTEER"
      },
      {
        available: Boolean(req.body.available)
      },
      {
        new: true,
        runValidators: true
      }
    ).select("-password");

    if (!volunteer) {
      return res.status(404).json({
        message: "Volunteer not found"
      });
    }

    res.json(volunteer);
  } catch (err) {
    res.status(400).json({
      message: err.message
    });
  }
};

const findNearbyVolunteers = async (req, res) => {
  try {
    const {
      longitude,
      latitude,
      skill
    } = req.query;

    const query = {
      role: "VOLUNTEER",
      available: true,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [
              Number(longitude),
              Number(latitude)
            ]
          },
          $maxDistance: 10000
        }
      }
    };

    if (skill) {
      query.skills = skill;
    }

    const volunteers = await User.find(query)
      .select("-password")
      .limit(20);

    res.json(volunteers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createVolunteer,
  getVolunteers,
  updateVolunteerAvailability,
  updateVolunteerLocation,
  findNearbyVolunteers
};