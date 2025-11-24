import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Container,
  TextField,
  Grid,
  MenuItem,
  Select,
  InputLabel,
} from '@mui/material';

interface DoshaResult {
  vata: number;
  pitta: number;
  kapha: number;
}

const DoshaCalculator: React.FC = () => {
  // State variables
  const [answers, setAnswers] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [doshaResult, setDoshaResult] = useState<DoshaResult | null>(null);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [age, setAge] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [timeOfDay, setTimeOfDay] = useState<string>('');
  const [season, setSeason] = useState<string>('');

  // Questions array
  const questions = [
    'I tend to have dry skin.',
    'I often feel cold, even in warm environments.',
    'I am a restless sleeper and wake up easily.',
    'I have a small appetite and often forget to eat.',
    'I tend to be anxious or worried.',
    'I have a sharp, penetrating intellect.',
    'I have a medium build and weight.',
    'I often feel warm or hot.',
    'I am easily irritated and can become angry quickly.',
    'I have a strong appetite and can eat a lot.',
    'I am ambitious and driven.',
    'I have oily skin and hair.',
    'I have a solid, sturdy build.',
    'I am calm and easy-going.',
    'I sleep deeply and have difficulty waking up.',
    'I have a slow metabolism and can gain weight easily.',
    'I am loyal and supportive.',
    'I tend to be lethargic and prefer to relax.',
    'I forgive easily and avoid confrontation.',
    'I have a sweet tooth and enjoy rich foods.',
  ];

  // Handlers
  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = parseInt(value);
    setAnswers(newAnswers);
  };

  const handleAgeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    setAge(isNaN(value) ? null : value);
  };

  const handleTimeOfDayChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeOfDay(event.target.value);
  };

  const handleSeasonChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSeason(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
  
    if (age === null || timeOfDay === '' || season === '') {
      alert('Please fill in all the fields.');
      return;
    }
  
    // Dosha calculation logic
    let vata = 0;
    let pitta = 0;
    let kapha = 0;
  
    for (let i = 0; i < questions.length; i++) {
      if (i % 3 === 0) vata += answers[i];
      if ((i - 1) % 3 === 0) pitta += answers[i];
      if ((i - 2) % 3 === 0) kapha += answers[i];
    }
  
    // Adjustments based on age
    if (age <= 20) {
      kapha += 5;
    } else if (age <= 60) {
      pitta += 5;
    } else {
      vata += 5;
    }
  
    // Adjustments based on time of day
    if (timeOfDay === 'morning') {
      kapha += 3;
    } else if (timeOfDay === 'afternoon') {
      pitta += 3;
    } else if (timeOfDay === 'evening') {
      vata += 3;
    }
  
    // Adjustments based on season
    if (season === 'spring') {
      kapha += 3;
    } else if (season === 'summer') {
      pitta += 3;
    } else if (season === 'autumn') {
      vata += 3;
    } else if (season === 'winter') {
      vata += 1;
      kapha += 2;
    }
  
    setDoshaResult({ vata, pitta, kapha });
    setShowResult(true);
    setSubmitted(true);
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" gutterBottom>
        Ayurvedic Dosha Calculator
      </Typography>
      <Box sx={{ mt: 3 }}>
        <form onSubmit={handleSubmit}>
          {/* Name and Gender removed: default values are used in submission */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Age"
                type="number"
                fullWidth
                value={age === null ? '' : age.toString()}
                onChange={handleAgeChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="time-of-day-label">Time of Day</InputLabel>
                <Select
                  labelId="time-of-day-label"
                  id="time-of-day"
                  value={timeOfDay}
                  label="Time of Day"
                  onChange={handleTimeOfDayChange}
                  required
                >
                  <MenuItem value="morning">Morning</MenuItem>
                  <MenuItem value="afternoon">Afternoon</MenuItem>
                  <MenuItem value="evening">Evening</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="season-label">Season</InputLabel>
                <Select
                  labelId="season-label"
                  id="season"
                  value={season}
                  label="Season"
                  onChange={handleSeasonChange}
                  required
                >
                  <MenuItem value="spring">Spring</MenuItem>
                  <MenuItem value="summer">Summer</MenuItem>
                  <MenuItem value="autumn">Autumn</MenuItem>
                  <MenuItem value="winter">Winter</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Typography variant="h6" component="h2" sx={{ mt: 3 }}>
            Answer the following questions:
          </Typography>
          {questions.map((question, index) => (
            <FormControl key={index} component="fieldset" sx={{ mt: 2, width: '100%' }}>
              <FormLabel component="legend">{question}</FormLabel>
              <RadioGroup
                row
                aria-label={`question-${index}`}
                name={`question-${index}`}
                value={answers[index].toString()}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
              >
                <FormControlLabel value="1" control={<Radio />} label="Yes" />
                <FormControlLabel value="0" control={<Radio />} label="No" />
              </RadioGroup>
            </FormControl>
          ))}

          <Button type="submit" variant="contained" color="primary" sx={{ mt: 3 }}>
            Calculate Dosha
          </Button>
        </form>
      </Box>

      {showResult && doshaResult && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Your Dosha Results:
          </Typography>
          <Typography>Vata: {doshaResult.vata}</Typography>
          <Typography>Pitta: {doshaResult.pitta}</Typography>
          <Typography>Kapha: {doshaResult.kapha}</Typography>
        </Box>
      )}
    </Container>
  );
};

export default DoshaCalculator;
