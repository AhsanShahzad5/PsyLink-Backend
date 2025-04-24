// routes/programRoutes.ts
import express from 'express';
import Program from '../models/ProgramModel';

const router = express.Router();

// Create a new program (accepts JSON from Postman)
router.post('/addProgram', async (req, res) => {
  try {
    const { planName, planDescription, duration, tasks } = req.body;

    if (!planName || !planDescription || !duration || !tasks) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const program = new Program({ planName, planDescription, duration, tasks });
    await program.save();

    res.status(201).json({ message: 'Program created successfully', program });
  } catch (error) {
    console.error('Error creating program:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/getPrograms', async (req, res) => {
    try {
      const programs = await Program.find();
      res.status(200).json(programs);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch programs' });
    }
  });
  

export default router;
