
const User = require('../models/User');
const path = require('path');
const fs = require('fs');

const validateName = (name) => {
  if (!name || name.trim().length === 0) return 'Name is required.';
  if (name.trim().length < 2) return 'Name must be at least 2 characters.';
  if (!/^[a-zA-Z\s]+$/.test(name.trim())) return 'Name can only contain letters and spaces.';
  return null;
};

const validatePassword = (password) => {
  if (!password || password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  if (!/[!@#$%^&*]/.test(password)) return 'Password must contain at least one special character (!@#$%^&*).';
  return null;
};


const getUsers = async (req, res) => {
  try {

    const search = req.query.search?.trim() || '';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    
    const [total, users] = await Promise.all([
      User.countDocuments(filter),

      User.find(filter)
        .sort({ createdAt: -1 })  
        .skip((page - 1) * limit)
        .limit(limit)
        .select('name email role status avatar createdAt')
    ]);

    
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      users,
      pagination: {
        total,        
        page,         
        limit,        
        totalPages    
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
};


const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    
    const nameError = validateName(name);
    if (nameError) {
      return res.status(400).json({ success: false, message: nameError });
    }

    if (!email || email.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email.' });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    // Validate role — only allow these two values
    if (role && !['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be user or admin.' });
    }

    // ── Check email uniqueness
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists.'
      });
    }

    
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role || 'user'
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists.'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
};


const updateUser = async (req, res) => {
  try {
    const { name, email, role, status, password } = req.body;
    const targetId = req.params.id;

    
    const user = await User.findById(targetId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    
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
        _id: { $ne: targetId }
      });
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: 'This email is already in use by another account.'
        });
      }
    }

  
    if (role !== undefined && !['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be user or admin.' });
    }

    
    if (status !== undefined && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be active or inactive.' });
    }

   
    if (password !== undefined && password !== '') {
      const passwordError = validatePassword(password);
      if (passwordError) {
        return res.status(400).json({ success: false, message: passwordError });
      }
    }

    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) user.email = email.toLowerCase().trim();
    if (role !== undefined) user.role = role;
    if (status !== undefined) user.status = status;
    if (password !== undefined && password !== '') user.password = password;

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        createdAt: user.createdAt
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


const deleteUser = async (req, res) => {
  try {
    const targetId = req.params.id;

    if (req.user._id.toString() === targetId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account.'
      });
    }

    const user = await User.findById(targetId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (user.avatar) {
      const avatarPath = path.join(__dirname, '..', user.avatar);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    await user.deleteOne();

    res.json({
      success: true,
      message: 'User deleted successfully.'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name email role status avatar createdAt');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.json({ success: true, user });

  } catch (error) {
   
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
};

module.exports = { getUsers, createUser, updateUser, deleteUser, getUserById };