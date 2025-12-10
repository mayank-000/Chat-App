import dotenv from "dotenv";
dotenv.config();

const app = import("./App");
const PORT = process.env.PORT || 3001;

const connectDB = import("./config/db");

connectDB();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})