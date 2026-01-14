import { User } from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import catchAsync from '../utils/catchAsync.js';

import dotenv from 'dotenv';
dotenv.config()
const JWT_SECRET = process.env.JWT_SECRET;

// Create a new user account
export const createUserAccount = catchAsync(async (req, res) => {
    const { username, email, password, publicKey } = req.body;

    // Validate input
    if(!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    if(password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if(!publicKey) {
        return res.status(400).json({ message: 'Public Key is required'});
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if(existingUser) {
        return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create new User
    const newUser = new User({
        email: email,
        password: hashedPassword,
        username: username,
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

    // Validate input
    if(!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
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
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
    return res 
        .status(200)
        .cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 24*60*60*1000
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
