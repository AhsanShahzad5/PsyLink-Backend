//connecting to mongodb server
import mongoose, { connect } from 'mongoose';
import "dotenv/config"

const { Schema } = mongoose;
import dotenv from 'dotenv';
dotenv.config()

//typescript casting , we fore it to be a string
async function connectToMongo() {
  await connect(process.env.MONGO_URI as string); 
}

connectToMongo().
then(()=>console.log("Connected to mongo")).
catch(err => console.log(err));


//export the module to index.js
export default connectToMongo;




