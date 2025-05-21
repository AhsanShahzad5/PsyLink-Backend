import express, { Request, Response } from 'express';
import cors from 'cors'
import "dotenv/config"
import PatientRoutes from './routes/PatientRoute'
import DoctorRoutes from './routes/DoctorRoutes';
import PsyncRoutes from './routes/PsyncRoutes';
import ProgramRoutes from './routes/ProgramRoutes'
import { v2 as cloudinary } from 'cloudinary'

//will un-comment db stuff after finalzing a url for mongo

import connectToMongo from '../db';
import AdminRoutes from './routes/AdminRoutes';
import User from './models/UserModel';
import UserRoutes from './routes/UserRoutes';
import { Server, Socket } from "socket.io";
import PaymentRoutes from './routes/PaymentRoutes';
import ComplaintRoutes from './routes/ComplaintRoute';
import AppointmentRoutes from './routes/AppointmentRoute';

const cookieParser = require("cookie-parser")

const errorMiddleware = require('./middlewares/error');

const app = express()
const PORT = process.env.PORT || 8000;





// Configure CORS options
const allowedOrigins = ['http://localhost:5173'];
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

//cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


app.get('/', async (req: Request, res: Response) => {
    res.json({ message: 'welcome psylink backend' });
})


//routes
app.use('/api/user', UserRoutes)
app.use('/api/patient', PatientRoutes)
app.use('/api/doctor', DoctorRoutes)
app.use('/api/admin', AdminRoutes)
app.use('/api/psync', PsyncRoutes)
app.use('/api/program',ProgramRoutes)
app.use('/api/payments', PaymentRoutes)
app.use('/api/complaints', ComplaintRoutes)
app.use('/api/appointments',AppointmentRoutes)

//error middleware
app.use(errorMiddleware);



const server = app.listen(PORT, () => {
    console.log(`PSYLINK BACKEND listening on port http://localhost:${PORT}`)
})

//Server for Video Calling

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

const emailToSocketIdMap = new Map();
const socketIdToEmailMap = new Map();

io.on("connection",(socket: Socket)=>{
    console.log(`Socket Connected `,socket.id);
    socket.on("room:join", (data) => {
        const {user, roomId} = data;
        const email = user.email;
        
        // Store mappings
        emailToSocketIdMap.set(user.email, socket.id);
        socketIdToEmailMap.set(socket.id, user.email);
        
        // Join the room
        socket.join(roomId);
        
        // Get all socket IDs in the room
        const room = io.sockets.adapter.rooms.get(roomId);
        const socketsInRoom = room ? Array.from(room) : [];
        
        // If we already have another user, tell both users about each other
        if (socketsInRoom.length > 1) {
            // Force a room broadcast of all users
            setTimeout(() => {
                const allUsers = socketsInRoom.map(sid => ({
                    id: sid,
                    email: socketIdToEmailMap.get(sid) || "unknown"
                }));
                
                // Send to everyone
                io.in(roomId).emit("room:users", { users: allUsers });
            }, 1000); // Small delay to ensure socket has fully joined
        }
        
        // Confirm room join
        io.to(socket.id).emit("room:join", data);
    });

    socket.on("user:call", ({to,offer})=>{
        io.to(to).emit("incomming:call",{from:socket.id,offer})
    })

    socket.on("call:accepted",({to,ans})=>{
        io.to(to).emit("call:accepted",{from:socket.id, ans })
    })

    socket.on("peer:nego:needed",({to, offer})=>{
        io.to(to).emit("peer:nego:needed",{from:socket.id, offer })
    })
    
    socket.on('peer:nego:done', ({to , ans})=>{
        io.to(to).emit("peer:nego:final",{from:socket.id, ans })
    })

    socket.on("chat:message", ({ message, roomId }) => {
        // Broadcast message to everyone in the room except sender
        socket.to(roomId).emit("chat:message", message);
      });
      
      // Handle file sharing
      socket.on("chat:file", ({ message, roomId }) => {
        // Broadcast file message to everyone in the room except sender
        socket.to(roomId).emit("chat:message", message);
      });


})


//unhandled Promise Rejection
process.on("unhandledRejection", (err: any) => {
    console.log(`Error: ${err.message}`);
    console.log(`Shutting down the server due to Unhandled Promise Rejection`);

    server.close(() => {
        process.exit(1);
    });
});