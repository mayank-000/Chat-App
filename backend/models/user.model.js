import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: {
        type: String, 
        required: true,
        unique: true,
    }, 
    email: {
        type: String, 
        required: true,
        unique: true,
    }, 
    password: {
        type: String,
        required: true,
    },
    publicKey: {
        type: String,
        default: null,
    },
    socketId: {
        type: String,
        default: null,
    },
    refreshToken: {
        type: String,
        default: null,
    },
    refreshTokenExpiry: {
        type: Date,
        default: null,
    }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);

