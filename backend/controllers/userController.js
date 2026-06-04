const User = require('../models/User');
const path = require('path');
const fs = require('fs');


const validateName = (name) => {
  if (!name || name.trim().length === 0) {
    return 'Name is required.';
  }
  if (name.trim().length < 2) {
    return 'Name must be at least 2 characters.';
  }
  if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
    return 'Name can only contain letters and spaces.';
  }
  return null;
};


const validatePassword = (password) => {
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.';
  }
  if (!/[!@#$%^&*]/.test(password)) {
    return 'Password must contain at least one special character (!@#$%^&*).';
  }
  return null;
};


const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
};


const updateMe = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (name !== undefined) {
      const nameError = validateName(name);
      if (nameError) {
        return res.status(400).json({ success: false, message: nameError });
      }
    }

    if (email !== undefined) {
      if (!email || email.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Email cannot be empty.' });
      }
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ success: false, message: 'Please enter a valid email.' });
      }

      const emailExists = await User.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: req.user._id }  
      });

      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: 'This email is already in use by another account.'
        });
      }
    }

    if (password !== undefined && password !== '') {
      const passwordError = validatePassword(password);
      if (passwordError) {
        return res.status(400).json({ success: false, message: passwordError });
      }
    }

    const user = await User.findById(req.user._id).select('+password');

    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) user.email = email.toLowerCase().trim();
    if (password !== undefined && password !== '') {
      user.password = password;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This email is already in use by another account.'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
};


const uploadAvatar = async (req, res) => {
  try {
    // Check if multer rejected the file type
    if (req.fileValidationError) {
      return res.status(400).json({
        success: false,
        message: req.fileValidationError
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select an image to upload.'
      });
    }

    const user = await User.findById(req.user._id);

    if (user.avatar) {
    
      const oldFilePath = path.join(__dirname, '..', user.avatar);

      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath); 
      }
    }

    user.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    res.json({
      success: true,
      message: 'Profile photo updated successfully.',
      avatar: user.avatar
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
};

module.exports = { getMe, updateMe, uploadAvatar };