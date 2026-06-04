
const express = require('express');
const router = express.Router();

const { protect, adminOnly } = require('../middleware/authMiddleware');

const {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserById
} = require('../controllers/adminController');

router.get('/users', protect, adminOnly, getUsers);

router.post('/users', protect, adminOnly, createUser);

router.get('/users/:id', protect, adminOnly, getUserById);

router.put('/users/:id', protect, adminOnly, updateUser);

router.delete('/users/:id', protect, adminOnly, deleteUser);

module.exports = router;