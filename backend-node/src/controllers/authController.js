import bcrypt from 'bcryptjs';
import config from '../config/index.js';
import { User, StudentProfile } from '../models/User.js';
import { createAccessToken, createRefreshToken, decodeToken } from '../middleware/auth.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(req, res, next) {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password || !full_name) {
      return res.status(422).json({ detail: 'Email, password, and full name are required.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(422).json({ detail: 'Please provide a valid email address.' });
    }

    const cleanName = String(full_name).trim();
    if (cleanName.length < 2 || cleanName.length > 150) {
      return res.status(422).json({ detail: 'Full name must be between 2 and 150 characters.' });
    }

    const pwd = String(password);
    if (pwd.trim().length < 8 || pwd.length > 100) {
      return res.status(422).json({ detail: 'Password must be between 8 and 100 characters long.' });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ detail: 'An account with this email address already exists.' });
    }

    // Bcrypt 12 rounds matching Python backend
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(pwd.slice(0, 72), salt);

    const user = new User({
      email: normalizedEmail,
      hashed_password: hashedPassword,
      full_name: cleanName,
      role: 'student', // Public registration enforces student role
      is_active: true,
      is_verified: false,
    });
    await user.save();

    // Create student profile
    const profile = new StudentProfile({
      user_id: user.id,
      headline: `Aspiring ${cleanName} Learner`,
      target_role: 'Software Engineer',
      education_level: 'Self-taught / University',
      target_hours_per_week: 10,
      preferred_learning_style: 'visual',
    });
    await profile.save();

    const accessToken = createAccessToken(user.id, user.role);
    const refreshToken = createRefreshToken(user.id, user.role);

    const userObj = user.toJSON();
    userObj.profile = profile.toJSON();

    return res.status(201).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: config.jwtAccessExpiresMinutes * 60,
      user: userObj,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(422).json({ detail: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ detail: 'Account has been deactivated. Please contact support.' });
    }

    const profile = await StudentProfile.findOne({ user_id: user.id });

    const accessToken = createAccessToken(user.id, user.role);
    const refreshToken = createRefreshToken(user.id, user.role);

    const userObj = user.toJSON();
    if (profile) userObj.profile = profile.toJSON();

    return res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: config.jwtAccessExpiresMinutes * 60,
      user: userObj,
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const { refresh_token: rToken } = req.body;
    if (!rToken) {
      return res.status(401).json({ detail: 'Refresh token required' });
    }

    let payload;
    try {
      payload = decodeToken(rToken);
    } catch (e) {
      return res.status(401).json({ detail: 'Invalid or expired refresh token' });
    }

    if (payload.type !== 'refresh') {
      return res.status(401).json({ detail: 'Expected refresh token, received access token' });
    }

    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ detail: 'Invalid token subject identifier' });
    }
    const user = await User.findOne({ id: userId });
    if (!user || !user.is_active) {
      return res.status(401).json({ detail: 'Account has been deactivated or not found' });
    }

    const profile = await StudentProfile.findOne({ user_id: user.id });

    const newAccessToken = createAccessToken(user.id, user.role);
    const newRefreshToken = createRefreshToken(user.id, user.role);

    const userObj = user.toJSON();
    if (profile) userObj.profile = profile.toJSON();

    return res.status(200).json({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: 'bearer',
      expires_in: config.jwtAccessExpiresMinutes * 60,
      user: userObj,
    });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    return res.status(200).json({
      message: 'If an account with that email exists, password recovery instructions have been prepared.',
      delivery_status: 'simulated',
      note: 'Development mode: External email delivery requires an SMTP provider. Administrators can reset credentials via /api/v1/admin/users.',
    });
  } catch (err) {
    next(err);
  }
}

export default {
  register,
  login,
  refresh,
  forgotPassword,
};
