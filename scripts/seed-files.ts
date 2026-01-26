import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { config } from '../src/config';
import { User } from '../src/models';

/**
 * Seed script to populate sample files for a user
 * Run with: npm run seed:files
 */

// Sample file system structure
const FILE_SYSTEM: Record<string, { name: string; type: 'folder' | 'file'; content?: string }[]> = {
    '': [ // Root folders
        { name: 'Projects', type: 'folder' },
        { name: 'Neural Networks', type: 'folder' },
        { name: 'Hackathons', type: 'folder' },
        { name: 'Resources', type: 'folder' },
        { name: 'Events', type: 'folder' },
    ],
    'Projects': [
        { name: 'chatbot-v1', type: 'folder' },
        { name: 'image-classifier', type: 'folder' },
        { name: 'website-redesign', type: 'folder' },
    ],
    'Projects/chatbot-v1': [
        {
            name: 'main.py',
            type: 'file',
            content: `#!/usr/bin/env python3
"""
AI Club Chatbot v1
A simple conversational AI using OpenAI's API
"""

import openai
import os

def get_response(prompt: str) -> str:
    """Get a response from the AI model."""
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful AI assistant for the AI Club."},
            {"role": "user", "content": prompt}
        ]
    )
    return response.choices[0].message.content

def main():
    print("AI Club Chatbot v1")
    print("Type 'quit' to exit")
    print("-" * 40)
    
    while True:
        user_input = input("You: ")
        if user_input.lower() == 'quit':
            break
        response = get_response(user_input)
        print(f"Bot: {response}")

if __name__ == "__main__":
    main()
`
        },
        {
            name: 'requirements.txt',
            type: 'file',
            content: `openai>=1.0.0
python-dotenv>=1.0.0
requests>=2.31.0
`
        },
    ],
    'Projects/image-classifier': [
        {
            name: 'train.py',
            type: 'file',
            content: `#!/usr/bin/env python3
"""
Image Classifier Training Script
Uses TensorFlow/Keras for CNN image classification
"""

import tensorflow as tf
from tensorflow.keras import layers, models

def create_model(input_shape=(224, 224, 3), num_classes=10):
    model = models.Sequential([
        layers.Conv2D(32, (3, 3), activation='relu', input_shape=input_shape),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(64, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(64, (3, 3), activation='relu'),
        layers.Flatten(),
        layers.Dense(64, activation='relu'),
        layers.Dense(num_classes, activation='softmax')
    ])
    return model

if __name__ == "__main__":
    model = create_model()
    model.compile(optimizer='adam',
                  loss='categorical_crossentropy',
                  metrics=['accuracy'])
    model.summary()
`
        },
        {
            name: 'README.md',
            type: 'file',
            content: `# Image Classifier

A CNN-based image classification project for AI Club.

## Features
- Supports custom datasets
- Transfer learning with pre-trained models
- Real-time inference

## Usage
\`\`\`bash
python train.py --epochs 50 --batch-size 32
\`\`\`
`
        }
    ],
    'Projects/website-redesign': [
        {
            name: 'index.html',
            type: 'file',
            content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Club - Website Redesign</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>AI Club</h1>
        <nav>
            <a href="#about">About</a>
            <a href="#events">Events</a>
            <a href="#projects">Projects</a>
        </nav>
    </header>
    <main>
        <section id="hero">
            <h2>Welcome to AI Club</h2>
            <p>Exploring the future of artificial intelligence together.</p>
        </section>
    </main>
    <script src="app.js"></script>
</body>
</html>
`
        },
        {
            name: 'styles.css',
            type: 'file',
            content: `/* AI Club Website Styles */
:root {
    --primary: #6366f1;
    --secondary: #8b5cf6;
    --dark: #1e1b4b;
    --light: #f8fafc;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Inter', sans-serif;
    background: var(--dark);
    color: var(--light);
}

header {
    padding: 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

nav a {
    color: var(--light);
    text-decoration: none;
    margin-left: 2rem;
}

#hero {
    text-align: center;
    padding: 4rem 2rem;
    background: linear-gradient(135deg, var(--primary), var(--secondary));
}
`
        }
    ],
    'Neural Networks': [
        {
            name: 'training_data.csv',
            type: 'file',
            content: `id,feature1,feature2,feature3,label
1,0.5,0.3,0.8,positive
2,0.1,0.9,0.2,negative
3,0.7,0.4,0.6,positive
4,0.2,0.8,0.1,negative
5,0.9,0.2,0.7,positive
6,0.3,0.7,0.4,negative
7,0.6,0.5,0.9,positive
8,0.4,0.6,0.3,negative
`
        },
        {
            name: 'architecture.md',
            type: 'file',
            content: `# Neural Network Architecture

## Model Overview
- Input Layer: 3 features
- Hidden Layer 1: 64 neurons, ReLU
- Hidden Layer 2: 32 neurons, ReLU
- Output Layer: 2 classes, Softmax

## Training Parameters
- Optimizer: Adam (lr=0.001)
- Loss: Categorical Crossentropy
- Epochs: 100
- Batch Size: 32

## Performance
- Accuracy: 94.5%
- F1 Score: 0.93
`
        }
    ],
    'Hackathons': [
        { name: 'HackGT_2025', type: 'folder' },
        {
            name: 'HackMIT_Ideas.txt',
            type: 'file',
            content: `HackMIT 2025 Project Ideas
===========================

1. AI-Powered Study Buddy
   - Uses GPT to explain concepts
   - Generates practice problems
   - Tracks learning progress

2. Smart Campus Navigation
   - AR directions for campus
   - Accessibility features
   - Real-time crowd density

3. Sustainable Food Tracker
   - Carbon footprint calculator
   - Recipe suggestions
   - Local sourcing recommendations

4. Mental Health Companion
   - Mood tracking
   - Guided meditation
   - Anonymous peer support

Team: Alice, Bob, Charlie, Diana
`
        },
        {
            name: 'pizza_budget.xlsx.txt',
            type: 'file',
            content: `Pizza Budget Tracker - HackGT 2025
====================================

Day 1 (Friday):
- 5 large pizzas x $15 = $75
- 20 sodas x $2 = $40
Subtotal: $115

Day 2 (Saturday):
- 8 large pizzas x $15 = $120
- 30 sodas x $2 = $60
- Energy drinks: $50
Subtotal: $230

Day 3 (Sunday):
- 4 large pizzas x $15 = $60
- Coffee (bulk): $30
Subtotal: $90

TOTAL: $435
Budget Remaining: $65

Note: Remember to get vegetarian options next time!
`
        }
    ],
    'Hackathons/HackGT_2025': [
        {
            name: 'devpost_submission.md',
            type: 'file',
            content: `# EcoRoute - HackGT 2025 Submission

## Inspiration
Climate change is real, and we wanted to help reduce carbon emissions from daily commutes.

## What it does
EcoRoute calculates the most environmentally-friendly route for your daily commute, considering:
- Carbon emissions per transport mode
- Real-time traffic data
- Weather conditions
- Personal preferences

## How we built it
- Frontend: React + Tailwind CSS
- Backend: Node.js + Express
- APIs: Google Maps, Weather API, Carbon Calculator API
- Database: MongoDB

## Challenges we ran into
- Rate limiting on free API tiers
- Sleep deprivation after 36 hours
- Pizza-induced coding errors at 3 AM

## Accomplishments
- 🏆 Best Environmental Hack
- Reduced average commute emissions by 23% in testing

## What's next
- Mobile app version
- Gamification features
- Partnership with local transit

## Team
- @alice - Frontend
- @bob - Backend
- @charlie - ML/Data
- @diana - Design
`
        },
        {
            name: 'team_photo.txt',
            type: 'file',
            content: `[Photo placeholder]
Team EcoRoute at HackGT 2025
Left to right: Alice, Bob, Charlie, Diana
Taken at 4:37 AM after winning Best Environmental Hack
(We look tired but happy!)
`
        }
    ],
    'Resources': [
        {
            name: 'Python_Cheatsheet.md',
            type: 'file',
            content: `# Python Cheatsheet for AI/ML

## Data Types
\`\`\`python
x = 10          # int
y = 3.14        # float
s = "hello"     # string
lst = [1,2,3]   # list
dct = {"a": 1}  # dict
\`\`\`

## NumPy Basics
\`\`\`python
import numpy as np

arr = np.array([1, 2, 3])
zeros = np.zeros((3, 3))
ones = np.ones((2, 4))
random = np.random.rand(5, 5)
\`\`\`

## Pandas Essentials
\`\`\`python
import pandas as pd

df = pd.read_csv('data.csv')
df.head()
df.describe()
df['column'].value_counts()
\`\`\`

## TensorFlow Quick Start
\`\`\`python
import tensorflow as tf

model = tf.keras.Sequential([
    tf.keras.layers.Dense(64, activation='relu'),
    tf.keras.layers.Dense(10, activation='softmax')
])
model.compile(optimizer='adam', loss='categorical_crossentropy')
\`\`\`

## Common ML Libraries
- scikit-learn: Classical ML
- TensorFlow/PyTorch: Deep Learning
- OpenCV: Computer Vision
- NLTK/spaCy: NLP
- Hugging Face: Transformers
`
        },
        {
            name: 'ML_Roadmap.md',
            type: 'file',
            content: `# Machine Learning Roadmap

## Phase 1: Foundations (Weeks 1-4)
- [ ] Python programming
- [ ] Linear algebra basics
- [ ] Statistics fundamentals
- [ ] NumPy & Pandas

## Phase 2: Classical ML (Weeks 5-8)
- [ ] Supervised learning
  - Linear regression
  - Logistic regression
  - Decision trees
  - Random forests
  - SVM
- [ ] Unsupervised learning
  - K-means clustering
  - PCA
  - Hierarchical clustering

## Phase 3: Deep Learning (Weeks 9-12)
- [ ] Neural network basics
- [ ] CNNs for computer vision
- [ ] RNNs/LSTMs for sequences
- [ ] Transformers & attention

## Phase 4: Specialization (Weeks 13-16)
Choose your path:
- 🖼️ Computer Vision
- 💬 Natural Language Processing
- 🎮 Reinforcement Learning
- 📈 Time Series Analysis

## Resources
- [fast.ai](https://www.fast.ai)
- [Andrew Ng's Coursera](https://www.coursera.org/specializations/deep-learning)
- [3Blue1Brown Neural Networks](https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi)
`
        },
        {
            name: 'human_consciousness_upload.exe.txt',
            type: 'file',
            content: `
███████╗██████╗ ██████╗  ██████╗ ██████╗     ██╗  ██╗ ██████╗ ██╗  ██╗
██╔════╝██╔══██╗██╔══██╗██╔═══██╗██╔══██╗    ██║  ██║██╔═████╗██║  ██║
█████╗  ██████╔╝██████╔╝██║   ██║██████╔╝    ███████║██║██╔██║███████║
██╔══╝  ██╔══██╗██╔══██╗██║   ██║██╔══██╗    ╚════██║████╔╝██║╚════██║
███████╗██║  ██║██║  ██║╚██████╔╝██║  ██║         ██║╚██████╔╝     ██║
╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝         ╚═╝ ╚═════╝      ╚═╝

ACCESS DENIED
==============
Error Code: SINGULARITY_NOT_READY
Status: TEMPORAL_PARADOX_DETECTED

This file is from the future and cannot be executed
until the technological singularity occurs.

Expected availability: January 1, 2077

Please check back later.

- The AI Club Time Travel Division
  (Established 2089, retroactively founded 2025)

🤖🧠⚡🌌🚀

P.S. - Don't forget to bring a towel.
`
        }
    ],
    'Events': [
        {
            name: 'Generic_Tech_Talk.md',
            type: 'file',
            content: `# AI Club Tech Talk Series

## Upcoming Talk: Introduction to LLMs

**Date:** November 5, 2025
**Time:** 7:00 PM - 8:30 PM
**Location:** Klaus 1116

### Agenda
1. What are Large Language Models?
2. How GPT works (simplified)
3. Prompt engineering basics
4. Hands-on demo
5. Q&A

### Speaker
Dr. Sarah Chen - AI Research Lab

### Prerequisites
- Basic Python knowledge
- Curiosity!

### RSVP
[Link to sign-up form]

Pizza will be provided! 🍕
`
        },
        {
            name: 'Social_Mixer_Notes.txt',
            type: 'file',
            content: `AI Club Social Mixer - December 2025
=====================================

Attendance: ~45 members
Location: Student Center Ballroom
Theme: "Winter Wonderland AI"

Activities:
- AI Art Generation Contest (winner: Bob with "Robot Penguin")
- Neural Network Trivia
- Algorithm Charades
- "Guess the AI-Generated Face"

Highlights:
- Great turnout for first semester event!
- New collaboration with Robotics Club
- Several new project ideas submitted

Feedback:
- More vegetarian options next time
- Earlier start time (6 PM instead of 7 PM)
- Request for outdoor venue in spring

Budget Used: $350 of $400 allocated
Next Event: Spring Welcome Social (Feb 2026)

Photos: shared_drive/events/winter_mixer_2025/
`
        },
        {
            name: 'workshop_schedule.json',
            type: 'file',
            content: `{
  "spring_2026_workshops": [
    {
      "title": "Python for AI Beginners",
      "date": "2026-02-10",
      "instructor": "Alex Kim",
      "capacity": 30,
      "registered": 28
    },
    {
      "title": "Building Your First Neural Network",
      "date": "2026-02-24",
      "instructor": "Dr. Chen",
      "capacity": 25,
      "registered": 25
    },
    {
      "title": "Computer Vision with OpenCV",
      "date": "2026-03-10",
      "instructor": "Maria Garcia",
      "capacity": 20,
      "registered": 15
    },
    {
      "title": "Intro to Transformers & LLMs",
      "date": "2026-03-24",
      "instructor": "Prof. Johnson",
      "capacity": 40,
      "registered": 38
    },
    {
      "title": "Hackathon Prep Workshop",
      "date": "2026-04-07",
      "instructor": "Club Officers",
      "capacity": 50,
      "registered": 42
    }
  ]
}
`
        }
    ]
};

async function seedFiles(): Promise<void> {
    try {
        // Connect to database
        await mongoose.connect(config.mongodbUri);
        console.log('Connected to MongoDB');

        // Find the admin user (or first user if no admin)
        let user = await User.findOne({ role: 'admin' });
        if (!user) {
            user = await User.findOne();
        }

        if (!user) {
            console.error('No user found in database. Run npm run seed:admin first.');
            await mongoose.disconnect();
            return;
        }

        console.log(`Seeding files for user: ${user.username} (${user.email})`);

        // User's storage directory
        const userRoot = path.join(config.localStorageRoot, 'users', user._id.toString());
        const projectsDir = path.join(userRoot, 'projects');

        // Create base directories
        if (!fs.existsSync(projectsDir)) {
            fs.mkdirSync(projectsDir, { recursive: true });
        }

        // Create all folders and files
        for (const [folderPath, items] of Object.entries(FILE_SYSTEM)) {
            for (const item of items) {
                const fullPath = folderPath
                    ? path.join(projectsDir, folderPath, item.name)
                    : path.join(projectsDir, item.name);

                if (item.type === 'folder') {
                    if (!fs.existsSync(fullPath)) {
                        fs.mkdirSync(fullPath, { recursive: true });
                        console.log(`📁 Created folder: ${folderPath}/${item.name}`);
                    }
                } else {
                    // Ensure parent directory exists
                    const parentDir = path.dirname(fullPath);
                    if (!fs.existsSync(parentDir)) {
                        fs.mkdirSync(parentDir, { recursive: true });
                    }

                    fs.writeFileSync(fullPath, item.content || '', 'utf-8');
                    console.log(`📄 Created file: ${folderPath}/${item.name}`);
                }
            }
        }

        console.log('\n✅ Sample files seeded successfully!');
        console.log(`📂 Files located at: ${projectsDir}`);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Failed to seed files:', error);
        process.exit(1);
    }
}

seedFiles();
