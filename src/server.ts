import express, { Request, Response } from 'express';
import cors from 'cors'
import "dotenv/config"
import PatientRoutes from './routes/PatientRoute'
import DoctorRoutes from './routes/DoctorRoutes';

//will un-comment db stuff after finalzing a url for mongo

import connectToMongo from '../db';
import AdminRoutes from './routes/AdminRoutes';
import User from './models/UserModel';
import UserRoutes from './routes/UserRoutes';
const cookieParser = require("cookie-parser")

const errorMiddleware = require('./middlewares/error');

const app = express()
const PORT = process.env.PORT || 5000;

const allowedOrigins = ['http://localhost:5173'];

// Configure CORS options
const corsOptions = {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "50mb" }))

app.use(cookieParser());


//connection to database
connectToMongo()



app.get('/', async (req: Request, res: Response) => {
    res.json({ message: 'welcome psylink backend' });
})


//routes
app.use('/api/user', UserRoutes)
app.use('/api/patient', PatientRoutes)
app.use('/api/doctor', DoctorRoutes)
app.use('/api/admin', AdminRoutes)

//error middleware
app.use(errorMiddleware);



const server = app.listen(PORT, () => {
    console.log(`Example app listening on port http://localhost:${PORT}`)
})


//unhandled Promise Rejection
process.on("unhandledRejection", (err:any) => {
    console.log(`Error: ${err.message}`);
    console.log(`Shutting down the server due to Unhandled Promise Rejection`);

    server.close( ()=> {
        process.exit(1);
    });
});