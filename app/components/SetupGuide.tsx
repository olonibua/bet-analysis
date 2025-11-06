'use client';

import { useState } from 'react';
import { ExternalLink, Key, Database, Activity } from 'lucide-react';

export function SetupGuide() {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Get Football-data.org API Key',
      description: 'Register for a free API key to access football fixtures and match data',
      icon: Key,
      action: (
        <a
          href="https://www.football-data.org/client/register"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Get API Key <ExternalLink className="ml-2 h-4 w-4" />
        </a>
      ),
      details: [
        'Visit football-data.org and create a free account',
        'Verify your email address',
        'Copy your API key from the dashboard',
        'Free tier includes 100 requests per day'
      ]
    },
    {
      title: 'Update Environment Variables',
      description: 'Add your API key to the .env.local file',
      icon: Database,
      action: (
        <code className="px-3 py-2 bg-gray-100 rounded text-sm">
          FOOTBALL_DATA_API_KEY=your_api_key_here
        </code>
      ),
      details: [
        'Open .env.local in your project root',
        'Replace "your_football_data_api_key_here" with your actual key',
        'Save the file and restart the development server',
        'The application will automatically detect the new key'
      ]
    },
    {
      title: 'Initialize Database',
      description: 'Run data sync to populate the database with fixtures',
      icon: Activity,
      action: (
        <button
          onClick={() => handleDataSync()}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Start Data Sync
        </button>
      ),
      details: [
        'Click "Start Data Sync" to begin crawling fixtures',
        'The process will fetch upcoming matches from major leagues',
        'Historical data will be collected for probability calculations',
        'This may take 5-10 minutes depending on API rate limits'
      ]
    }
  ];

  const handleDataSync = async () => {
    try {
      const response = await fetch('/api/sync?action=full', {
        method: 'POST'
      });
      const result = await response.json();

      if (result.success) {
        alert('Data sync started successfully! Check the console for progress.');
      } else {
        alert('Data sync failed. Please check your API key configuration.');
      }
    } catch (error) {
      alert('Error starting data sync. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to Sports Probability Engine
        </h2>
        <p className="text-lg text-gray-600">
          Follow these steps to set up your betting intelligence platform
        </p>
      </div>

      <div className="space-y-8">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`border rounded-lg p-6 transition-all ${
              currentStep === index
                ? 'border-blue-500 bg-blue-50'
                : currentStep > index
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-start space-x-4">
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep > index
                    ? 'bg-green-500 text-white'
                    : currentStep === index
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {currentStep > index ? '✓' : index + 1}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <step.icon className="h-6 w-6 text-gray-600" />
                    <h3 className="text-xl font-semibold text-gray-900">
                      {step.title}
                    </h3>
                  </div>
                  {step.action}
                </div>

                <p className="text-gray-600 mb-4">{step.description}</p>

                <ul className="space-y-2">
                  {step.details.map((detail, detailIndex) => (
                    <li key={detailIndex} className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span className="text-sm text-gray-700">{detail}</span>
                    </li>
                  ))}
                </ul>

                {currentStep === index && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setCurrentStep(index + 1)}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Mark as Complete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {currentStep >= steps.length && (
        <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              ✓
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-900">Setup Complete!</h3>
              <p className="text-green-700">
                Your Sports Probability Engine is ready to use. You can now view upcoming events with probability predictions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}