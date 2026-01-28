import { User } from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import catchAsync from '../utils/catchAsync.js';
import { sanitizeUsername, sanitizeEmail } from '../utils/sanitization.js';

import dotenv from 'dotenv';
dotenv.config()
const JWT_SECRET = process.env.JWT_SECRET;

// generating access and refresh tokens
const generateAccessToken = (userId) => {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' });
};
const generateRefreshToken = (userId) => {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7D' });
}

// Create a new user account
export const createUserAccount = catchAsync(async (req, res) => {
    const { username, email, password, publicKey } = req.body;

    // Sanitize inputs to prevent XSS
    const sanitizedUsername = sanitizeUsername(username);
    const sanitizedEmail = sanitizeEmail(email);

    // Validate input after sanitization
    if(!sanitizedUsername || !sanitizedEmail || !password) {
        return res.status(400).json({ message: 'All fields are required and must be valid' });
    }
    if(password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if(!publicKey) {
        return res.status(400).json({ message: 'Public Key is required'});
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: sanitizedEmail });
    if(existingUser) {
        return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new User with sanitized inputs
    const newUser = new User({
        email: sanitizedEmail,
        password: hashedPassword,
        username: sanitizedUsername,
        publicKey: publicKey
    })

    // Save user to database
    await newUser.save();

    res.status(201).json({ 
        success: true, 
        message: 'User created successfully',
        user: {
            id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            publicKey: newUser.publicKey
        }
    });
});

// Login user and generate JWT token
export const loginUser = catchAsync(async (req, res) => {
    const { email, password } = req.body;

    // Sanitize email input
    const sanitizedEmail = sanitizeEmail(email);

    // Validate input
    if(!sanitizedEmail || !password) {
        return res.status(400).json({ message: 'Valid email and password are required' });
    }

    // Find user by sanitized email
    const user = await User.findOne({ email: sanitizedEmail });
    if(!user) {
        return res.status(400).json({ message: 'Invalid email or password' });
    }
    // Hash password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    // Check password
    if(!isPasswordValid) {
        return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    user.refreshToken = hashedRefreshToken;
    user.refreshTokenExpiry = Date.now()+7*24*60*60*1000;
    await user.save();

    return res 
        .status(200)
        .cookie('accesstoken', accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 15*60*1000
        })
        .cookie('refreshtoken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7*24*60*60*1000
        })
        .json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                publicKey: user.publicKey
            }
        })
});

export const refreshAccessToken = catchAsync(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({ success: false, message: 'No Refresh token' });
    }

    const payload = jwt.verify(refreshToken, JWT_SECRET)

    const user = await User.findById(payload.userId);

    if(!user || !user.refreshToken) {
        return res.status(401).json({ message: 'Invalid Token Provided' });
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);

    // Check password
    if(!isValid || user.refreshTokenExpiry < Date.now()) {
        return res.status(401).json({ message: 'Expired Refresh Token' });
    }

    const newAccessToken = generateAccessToken(user._id);

    return res
        .cookie('accesstoken', newAccessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 15*60*1000
        })
        .json({
            success: true, 
            message: 'Access token refreshed'
        });
})


// Get user profile
export const getUserProfile = catchAsync(async (req, res) => {
    // User already fetched in middleware with password excluded
    const user = {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        publicKey: req.user.publicKey
    };
    
    res.status(200).json({
        success: true,
        user
    });
});

// Logout User
export const logout = async() => {
    cookie.clear('accesstoken');
};
