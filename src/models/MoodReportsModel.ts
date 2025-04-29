const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MoodProgressReportSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // patientId: {
  //   type: Schema.Types.ObjectId,
  //   ref: 'Patient',
  //   required: true
  // },
  patientName: {
    type: String,
    required: true
  },
  patientSex: {
    type: String,
    required: true
  },
  patientAge: {
    type: Number,
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  daysWithMoodLogged: {
    type: Number,
    required: true
  },
  totalDays: {
    type: Number,
    required: true
  },
  prescribedMedicines: {
    type: String,
    default: 'None'
  },
  moodAvgPercentage: {
    type: Number,
    required: true
  },
  progressStatus: {
    type: String,
    enum: ['Good Progress', 'Average Progress', 'Needs Improvement'],
    required: true
  },
  moodData: [{
    date: {
      type: String,
      required: true
    },
    feeling: {
      type: String,
      required: true
    }
  }],
  daysGoingWell: {
    type: Number,
    required: true
  },
  daysGoingBad: {
    type: Number,
    required: true
  },
  daysWithNoMood: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

const MoodProgressReport = mongoose.model('MoodProgressReport', MoodProgressReportSchema);
export default MoodProgressReport;