import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { hasPrivateKey, loadPrivateKey } from '../utils/indexdb';
import './Auth.css';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const { signin } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setErrorMsg('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');

        try {
            const response = await signin(formData);

            const userId = response.user?.id || response.user?._id;
    
            if (!userId) {
              throw new Error('User ID not found in login response');
            }

            // Check if private key exists in IndexedDB
            const keyExists = await hasPrivateKey(userId);
            
            if (!keyExists) {
                console.warn('Private key not found for user ID:', userId);
                alert('⚠️ Encryption keys not found. You won\'t be able to read encrypted messages from this device.');
                } else {
                    console.log('Private key found for user:', userId);
                }
            }

            navigate('/'); // Redirect to home/chat page
        } catch (error) {
            console.log('Login error:', error);
            setErrorMsg(error.message || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Welcome Back</h2>
                <p className="auth-subtitle">Sign in to continue</p>

                {errorMsg && (
                    <div className="error-message">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="Enter your email"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder="Enter your password"
                            disabled={isLoading}
                        />
                    </div>

                    <button 
                        type="submit" 
                        className="btn-primary"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p className="auth-footer">
                    Don't have an account? <Link to="/signup">Sign up</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
