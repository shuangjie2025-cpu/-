
import React from 'react';

interface Step {
  id: number;
  name: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
  return (
    <div className="space-y-2">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;

        return (
          <div key={step.id} className="flex items-center relative">
            <div className={`flex items-center justify-center w-12 h-12 rounded-lg text-xl font-bold transition-colors ${
                isActive ? 'bg-[#009999] text-white' : isCompleted ? 'bg-gray-300 text-gray-600' : 'bg-white text-gray-400 border'
            }`}>
              {isCompleted ? <div className="w-6 h-6 text-gray-600"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg></div> : step.id}
            </div>
            <div className={`ml-4 text-lg ${isActive ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
              {step.name}
            </div>
            {isActive && <div className="absolute -left-8 w-1.5 h-12 bg-[#009999] rounded-r-full"></div>}
          </div>
        );
      })}
    </div>
  );
};
