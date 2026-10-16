const bugModel = require('../models/bugModel');
const asyncHandler = require('../utils/asyncHandler');

const aiService = require('../services/aiService');
const userModel = require('../models/userModel');

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
    const [comments, assignmentHistory] = await Promise.all([
      bugModel.findComments(req.params.id).catch(() => []),
      bugModel.findAssignmentHistory(req.params.id).catch(() => []),
    ]);
    return res.json({ data: { ...bug, comments, assignment_history: assignmentHistory } });
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
    const bug = await bugModel.assign(
      req.params.id,
      req.body.assigned_to,
      req.user?.id ?? null
    );
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

  aiTriage: asyncHandler(async (req, res) => {
    const { title, description, steps_to_reproduce } = req.body || {};
    const result = await aiService.triageBug({
      title,
      description,
      steps_to_reproduce,
    });
    return res.json({
      ...result,
      config: aiService.getConfig(),
    });
  }),

  aiSuggestAssignee: asyncHandler(async (req, res) => {
    const bug = await bugModel.findById(req.params.id);
    if (!bug) {
      return res.status(404).json({ error: 'Bug not found' });
    }
    const [users, stats] = await Promise.all([
      userModel.findAll().catch(() => []),
      bugModel.getAssignmentStats().catch(() => []),
    ]);
    const statsByUser = {};
    (stats || []).forEach((item) => {
      statsByUser[item.user_id || item.userId || item.id] = item;
    });
    const candidates = aiService.recommendAssignees({
      bug,
      users,
      statsByUser,
    });
    return res.json({
      ...candidates,
      config: aiService.getConfig(),
    });
  }),
};

module.exports = bugController;
