import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  Book, 
  Code, 
  FileCode, 
  BookOpen,
  BrainCircuit
} from 'lucide-react';

// Define learning path stages
interface LearningStage {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  current: boolean;
}

export function LearningPathVisualization() {
  // Sample learning path - in a real app, this would come from the backend
  const [stages, setStages] = useState<LearningStage[]>([
    {
      id: 'understand',
      title: 'Understand Code',
      description: 'Use the Code to Text feature to explain code snippets',
      icon: <Code className="h-6 w-6" />,
      completed: false,
      current: true
    },
    {
      id: 'learn',
      title: 'Learn Concepts',
      description: 'Master programming concepts through explanations',
      icon: <Book className="h-6 w-6" />,
      completed: false,
      current: false
    },
    {
      id: 'practice',
      title: 'Practice Writing',
      description: 'Use the Text to Code feature to write your own code',
      icon: <FileCode className="h-6 w-6" />,
      completed: false,
      current: false
    },
    {
      id: 'analyze',
      title: 'Analyze Projects',
      description: 'Use the GitHub Repository Browser to understand full applications',
      icon: <BookOpen className="h-6 w-6" />,
      completed: false,
      current: false
    },
    {
      id: 'master',
      title: 'Master Development',
      description: 'Put it all together to become a proficient developer',
      icon: <BrainCircuit className="h-6 w-6" />,
      completed: false,
      current: false
    }
  ]);

  // Animation for the progress indicator
  const progressRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Calculate progress based on completed stages
    const completedCount = stages.filter(stage => stage.completed).length;
    const currentIndex = stages.findIndex(stage => stage.current);
    
    // If there's a current stage, add half a step to the progress
    const progressValue = completedCount + (currentIndex >= 0 ? 0.5 : 0);
    const percentage = (progressValue / stages.length) * 100;
    
    setProgress(percentage);
  }, [stages]);

  // Function to mark a stage as completed and advance to the next
  const completeStage = (stageId: string) => {
    setStages(prevStages => {
      const newStages = [...prevStages];
      const currentIndex = newStages.findIndex(stage => stage.id === stageId);
      
      // Mark current stage as completed
      if (currentIndex >= 0) {
        newStages[currentIndex] = {
          ...newStages[currentIndex],
          completed: true,
          current: false
        };
        
        // Set next stage as current if available
        if (currentIndex < newStages.length - 1) {
          newStages[currentIndex + 1] = {
            ...newStages[currentIndex + 1],
            current: true
          };
        }
      }
      
      return newStages;
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 my-8">
      <h2 className="text-2xl font-bold mb-6 text-center">Your Learning Journey</h2>
      
      {/* Progress bar */}
      <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-8 overflow-hidden">
        <motion.div 
          ref={progressRef}
          className="absolute top-0 left-0 h-full bg-primary-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      </div>
      
      {/* Learning path visualization */}
      <div className="relative">
        {stages.map((stage, index) => (
          <div 
            key={stage.id} 
            className={`flex items-start mb-8 ${index < stages.length - 1 ? 'relative' : ''}`}
          >
            {/* Connecting line between stages */}
            {index < stages.length - 1 && (
              <div className="absolute top-6 left-4 w-0.5 h-full -mt-2 bg-gray-300 dark:bg-gray-600" />
            )}
            
            {/* Stage icon with animation */}
            <motion.div 
              className={`relative z-10 flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${
                stage.completed 
                  ? 'bg-green-100 dark:bg-green-900' 
                  : stage.current 
                    ? 'bg-primary-100 dark:bg-primary-900 animate-pulse' 
                    : 'bg-gray-100 dark:bg-gray-700'
              }`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.2 }}
            >
              {stage.completed ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : stage.current ? (
                <div className="relative">
                  <Circle className="h-6 w-6 text-primary-500" />
                  <motion.div 
                    className="absolute inset-0 rounded-full bg-primary-400 dark:bg-primary-600 opacity-50"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              ) : (
                <Circle className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              )}
            </motion.div>
            
            {/* Stage content */}
            <motion.div 
              className="ml-6 flex-1"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.3 }}
            >
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 mr-3">
                  {stage.icon}
                </div>
                <h3 className={`text-lg font-semibold ${
                  stage.completed 
                    ? 'text-green-600 dark:text-green-400' 
                    : stage.current 
                      ? 'text-primary-600 dark:text-primary-400' 
                      : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {stage.title}
                </h3>
              </div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">{stage.description}</p>
              
              {/* Action button for current stage */}
              {stage.current && (
                <motion.button
                  onClick={() => completeStage(stage.id)}
                  className="mt-3 inline-flex items-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300"
                  initial={{ y: 5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.3 + 0.2 }}
                >
                  Continue learning <ChevronRight className="ml-1 h-4 w-4" />
                </motion.button>
              )}
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
}