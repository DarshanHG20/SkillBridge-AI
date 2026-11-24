import { User, StudentProfile } from '../models/User.js';

export async function getMe(req, res, next) {
  try {
    const profile = await StudentProfile.findOne({ user_id: req.user.id });
    const userObj = req.user.toJSON();
    if (profile) userObj.profile = profile.toJSON();
    return res.status(200).json(userObj);
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req, res, next) {
  try {
    const { full_name } = req.body;
    if (full_name !== undefined) {
      const cleanName = String(full_name).trim();
      if (cleanName.length < 2 || cleanName.length > 150) {
        return res.status(422).json({ detail: 'Full name must be between 2 and 150 characters.' });
      }
      req.user.full_name = cleanName;
      await req.user.save();
    }
    const profile = await StudentProfile.findOne({ user_id: req.user.id });
    const userObj = req.user.toJSON();
    if (profile) userObj.profile = profile.toJSON();
    return res.status(200).json(userObj);
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    let profile = await StudentProfile.findOne({ user_id: req.user.id });
    if (!profile) {
      profile = new StudentProfile({ user_id: req.user.id });
    }

    if (req.body.target_hours_per_week !== undefined) {
      const hrs = Number(req.body.target_hours_per_week);
      if (!Number.isFinite(hrs) || hrs < 1 || hrs > 100) {
        return res.status(422).json({ detail: 'Target hours per week must be between 1 and 100.' });
      }
    }

    const fields = [
      'headline', 'bio', 'target_role', 'education_level',
      'target_hours_per_week', 'preferred_learning_style',
    ];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        profile[f] = req.body[f];
      }
    }

    await profile.save();
    return res.status(200).json(profile.toJSON());
  } catch (err) {
    next(err);
  }
}

export async function getUserById(req, res, next) {
  try {
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ detail: 'Invalid user ID parameter.' });
    }
    // Students can only view their own profile
    if (req.user.id !== targetId && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({
        detail: 'Access forbidden: you cannot inspect or modify another learner\'s profile.',
      });
    }

    const user = await User.findOne({ id: targetId });
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    const profile = await StudentProfile.findOne({ user_id: user.id });
    const userObj = user.toJSON();
    if (profile) userObj.profile = profile.toJSON();
    return res.status(200).json(userObj);
  } catch (err) {
    next(err);
  }
}

export default {
  getMe,
  updateMe,
  updateProfile,
  getUserById,
};
