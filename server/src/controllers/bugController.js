const bugModel = require('../models/bugModel');
const asyncHandler = require('../utils/asyncHandler');

const bugController = {
  list: asyncHandler(async (req, res) => {
    const { status, priority, severity, assigned_to, search } = req.query;
    const bugs = await bugModel.findAll({ status, priority, severity, assigned_to, search });
    res.json({ data: bugs });
  }),

  getById: asyncHandler(async (req, res) => {
    const bug = await bugModel.findById(req.params.id);
    if (!bug) {
      return res.status(404).json({ error: 'Bug not found' });
    }
    const comments = await bugModel.findComments(req.params.id);
    return res.json({ data: { ...bug, comments } });
  }),

  create: asyncHandler(async (req, res) => {
    const bug = await bugModel.create({
      ...req.body,
      created_by: req.body.created_by ?? req.user?.id ?? null,
    });
    res.status(201).json({ data: bug });
  }),

  update: asyncHandler(async (req, res) => {
    const bug = await bugModel.update(req.params.id, req.body);
    if (!bug) {
      return res.status(404).json({ error: 'Bug not found' });
    }
    return res.json({ data: bug });
  }),

  assign: asyncHandler(async (req, res) => {
    const bug = await bugModel.assign(req.params.id, req.body.assigned_to);
    if (!bug) {
      return res.status(404).json({ error: 'Bug not found' });
    }
    return res.json({ data: bug });
  }),

  remove: asyncHandler(async (req, res) => {
    const removed = await bugModel.remove(req.params.id);
    if (!removed) {
      return res.status(404).json({ error: 'Bug not found' });
    }
    return res.status(204).send();
  }),

  listComments: asyncHandler(async (req, res) => {
    const bug = await bugModel.findById(req.params.id);
    if (!bug) {
      return res.status(404).json({ error: 'Bug not found' });
    }
    const comments = await bugModel.findComments(req.params.id);
    return res.json({ data: comments });
  }),

  addComment: asyncHandler(async (req, res) => {
    const bug = await bugModel.findById(req.params.id);
    if (!bug) {
      return res.status(404).json({ error: 'Bug not found' });
    }
    const comment = await bugModel.addComment({
      bugId: req.params.id,
      userId: req.user?.id ?? req.body.user_id ?? null,
      message: req.body.message,
    });
    return res.status(201).json({ data: comment });
  }),
};

module.exports = bugController;
