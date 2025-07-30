export {};
import { NextFunction, Request, Response, Router } from 'express';
const httpStatus = require('http-status');
const { omit } = require('lodash');
import { User, UserNote } from '../../api/models';
import { apiJson } from '../../api/utils/Utils';
const { handler: errorHandler } = require('../middlewares/error');

const likesMap: any = {}; // key (userId__noteId) : 1

/**
 * Load user and append to req.
 * @public
 */
exports.load = async (req: Request, res: Response, next: NextFunction, id: any) => {
  try {
    const user = await User.get(id);
    req.route.meta = req.route.meta || {};
    req.route.meta.user = user;
    return next();
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

/**
 * Get logged in user info
 * @public
 */
const loggedIn = (req: Request, res: Response) => res.json(req.route.meta.user.transform());
exports.loggedIn = loggedIn;

/**
 * Get user
 * @public
 */
exports.get = loggedIn;

/**
 * Create new user
 * @public
 */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = new User(req.body);
    const savedUser = await user.save();
    res.status(httpStatus.CREATED);
    res.json(savedUser.transform());
  } catch (error) {
    next(User.checkDuplicateEmail(error));
  }
};

/**
 * Replace existing user
 * @public
 */
exports.replace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req.route.meta;
    const newUser = new User(req.body);
    const ommitRole = user.role !== 'admin' ? 'role' : '';
    const newUserObject = omit(newUser.toObject(), '_id', ommitRole);

    await user.update(newUserObject, { override: true, upsert: true });
    const savedUser = await User.findById(user._id);

    res.json(savedUser.transform());
  } catch (error) {
    next(User.checkDuplicateEmail(error));
  }
};

/**
 * Update existing user
 * @public
 */
exports.update = (req: Request, res: Response, next: NextFunction) => {
  const ommitRole = req.route.meta.user.role !== 'admin' ? 'role' : '';
  const updatedUser = omit(req.body, ommitRole);
  const user = Object.assign(req.route.meta.user, updatedUser);

  user
    .save()
    .then((savedUser: any) => res.json(savedUser.transform()))
    .catch((e: any) => next(User.checkDuplicateEmail(e)));
};

/**
 * Get user list
 * @public
 * @example GET /v1/users?role=admin&limit=5&offset=0&sort=email:desc,createdAt
 */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = (await User.list(req)).transform(req);
    apiJson({ req, res, data, model: User });
  } catch (e) {
    next(e);
  }
};

/**
 * Get user's notes.
 * @public
 * @example GET /v1/users/userId/notes
 */
exports.listUserNotes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    req.query = { ...req.query, userId: userId }; // append to query (by userId) to final query
    const data = (await UserNote.list({ query: req.query })).transform(req);
    apiJson({ req, res, data, model: UserNote });
  } catch (e) {
    next(e);
  }
};

/**
 * Add a note.
 * @example POST /v1/users/userId/notes - payload { title, note }
 */
exports.createNote = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.params;
  const { title, note } = req.body;
  try {
    const data = await UserNote.create({
      userId: parseInt(userId),
      title,
      note
    });
    apiJson({ req, res, data, model: UserNote });
  } catch (e) {
    next(e);
  }
};

/**
 * Read a user's note.
 * NOTE: Any logged in user can get a list of notes of any user. Implement your own checks.
 * @public
 * @example GET /v1/users/userId/notes/noteId
 */
exports.readUserNote = async (req: Request, res: Response, next: NextFunction) => {
  const { userId, noteId } = req.params;
  const { id } = req.route.meta.user;
  const currentUserId = id.toString();
  if (userId !== currentUserId) {
    return next(); // only logged in user can read her own notes
  }
  try {
    const data = await UserNote.findOne({ 
      where: { 
        userId: parseInt(userId), 
        id: parseInt(noteId) 
      } 
    });
    apiJson({ req, res, data });
  } catch (e) {
    next(e);
  }
};

/**
 * Update a user's note.
 * @public
 * @example POST /v1/users/userId/notes/noteId
 */
exports.updateUserNote = async (req: Request, res: Response, next: NextFunction) => {
  const { userId, noteId } = req.params;
  const { id } = req.route.meta.user;
  const { note } = req.body;
  const currentUserId = id.toString();
  if (userId !== currentUserId) {
    return next(); // only logged in user can update her own notes
  }
  try {
    await UserNote.update(
      { note }, 
      { 
        where: { 
          userId: parseInt(userId), 
          id: parseInt(noteId) 
        } 
      }
    );
    apiJson({ req, res, data: {} });
  } catch (e) {
    next(e);
  }
};

/**
 * Delete user note
 * @public
 */
exports.deleteUserNote = async (req: Request, res: Response, next: NextFunction) => {
  const { userId, noteId } = req.params;
  const { id } = req.route.meta.user;
  const currentUserId = id.toString();
  if (userId !== currentUserId) {
    return next(); // only logged in user can delete her own notes
  }
  try {
    await UserNote.destroy({ 
      where: { 
        userId: parseInt(userId), 
        id: parseInt(noteId) 
      } 
    });
    apiJson({ req, res, data: {} });
  } catch (e) {
    next(e);
  }
};

/**
 * Like user note
 * @public
 */
exports.likeUserNote = async (req: Request, res: Response, next: NextFunction) => {
  const { noteId } = req.params;
  const { id } = req.route.meta.user;
  const currentUserId = id.toString();
  if (likesMap[`${currentUserId}__${noteId}`]) {
    return next(); // already liked => return.
  }
  try {
    const dbItem = await UserNote.findByPk(parseInt(noteId));
    if (!dbItem) {
      return next(); // note not found
    }
    const newLikes = (dbItem.likes > 0 ? dbItem.likes : 0) + 1;

    await UserNote.update(
      { likes: newLikes }, 
      { where: { id: parseInt(noteId) } }
    );
    likesMap[`${currentUserId}__${noteId}`] = 1; // flag as already liked.
    apiJson({ req, res, data: {} });
  } catch (e) {
    next(e);
  }
};

/**
 * Delete user
 * @public
 */
exports.remove = async (req: Request, res: Response, next: NextFunction) => {
  const { user } = req.route.meta;
  try {
    await user.destroy();
    res.status(httpStatus.NO_CONTENT).end();
  } catch (e) {
    next(e);
  }
};
