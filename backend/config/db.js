import mongoose from 'mongoose';
 
const MAX_RETRIES = 3;
const RETRY_INTERVAL = 5000;

class DatabaseConnection {
    constructor() {
        this.retryCount = 0;
        this.isConnected = false;

        mongoose.set('strictQuery', true);

        mongoose.connection.on('connected', () => {
            console.log('MongoDB connected successfully');
            this.isConnected = true;
        })

        mongoose.connection.on('error', (err) => {
            console.log('MongoDB connection error:', err);
            this.isConnected = false;
        })

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️ MongoDB disconnected');
            this.isConnected = false;
            this.handleDisconnection(); // Triggers automatic reconnection logic
        });

        process.on('SIGINT', this.handleAppTermination.bind(this));
        process.on('SIGTERM', this.handleAppTermination.bind(this));
    }

    async connectDB() {
        try {
            if (!process.env.MONGO_URI) {
                throw new Error('MongoDB URI is not defined in environment variables');
            }

            const connectionOptions = {
                maxPoolSize: 10, // Maintain up to 10 socket connections
                serverSelectionTimeoutMS: 5000, // Wait up to 5 seconds for server selection
                socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
                family: 4, // Use IPv4 (avoid IPv6 issues)
            };

            await mongoose.connect(process.env.MONGO_URI, connectionOptions);
            this.retryCount = 0;
            
        } catch (error) {
            console.error('Failed to connect to MongoDB:', error.message);
            await this.handleConnectionError();
        }
    }

    async handleConnectionError() {
        if (this.retryCount < MAX_RETRIES) {
            this.retryCount++;
            console.log(`Retrying connection... Attempt ${this.retryCount} of ${MAX_RETRIES}`);
            await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
            return this.connectDB();
        } else {
            console.error(`Failed to connect to MongoDB after ${MAX_RETRIES} attempts`);
            process.exit(1);
        }
    }

    handleDisconnection() {
        if(!this.isConnected) {
            console.log('Attempting to reconnect to MongoDB');
            this.connectDB();
        }
    }

    async handleAppTermination() {
        try {
            await mongoose.connection.close();
            console.log('MongoDB connection closed')
            process.exit(0);
        } catch (err) {
            console.error('Error during database disconnecting', err);
            process.exit(1);
        }
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            name: mongoose.connection.name
        }
    }
}

// Create a singleton instance
const dbConnection = new DatabaseConnection();

// Export the connect function and the instance
export default dbConnection.connectDB.bind(dbConnection);
export const getDBStatus = dbConnection.getConnectionStatus.bind(dbConnection);