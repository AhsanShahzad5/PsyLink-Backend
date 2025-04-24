import mongoose, { Schema } from 'mongoose';

const TaskSchema = new Schema({
  taskName: { type: String, required: true },
  taskDescription: { type: String, required: true },
  repetitions: { type: Number, required: true },
});

const ProgramSchema = new Schema({
  planName: { type: String, required: true },
  planDescription: { type: String, required: true },
  duration: { type: String, enum: ['15 days', '30 days'], required: true },
  tasks: [TaskSchema],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Program', ProgramSchema);
