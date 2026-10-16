const userModel = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');

const userController = {
  list: asyncHandler(async (_req, res) => {
    const users = await userModel.findAll();
    res.json({ data: users });
  }),

  getById: asyncHandler(async (req, res) => {
    const user = await userModel.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ data: user });
  }),

  me: asyncHandler(async (req, res) => {
    const user = await userModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ data: user });
  }),

  create: asyncHandler(async (req, res) => {
    const user = await userModel.create(req.body);
    res.status(201).json({ data: user });
  }),
};

module.exports = userController;
