'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface QuizQuestion {
  status: string;
  question_type: string;
  question: string;
  choices: string[];
  answer: string;
  explanation: string;
}

const getApiUrl = () => {
  if (process.env.VERCEL_ENV === 'production') {
    return 'https://recall-ai-app.vercel.app/api';
  }
  else {
    return 'http://localhost:8000/api';
  }
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [showExplanation, setShowExplanation] = useState<{ [key: number]: boolean }>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const handleFileUpload = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${getApiUrl()}/upload`, {
        method: 'POST',
        body: formData,
      });
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('response data:', data);
      if (!response.ok) {
        // The backend sends error details in a nested format
        console.error('Error response:', data);
        throw new Error(data.detail?.message || 'Server error');
      }

      // The successful response includes status, message, and splits
      if (data.status === 'success') {
        // alert(`${data.message} (${data.splits} sections processed)`);
      } else {
        throw new Error(data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(error instanceof Error ? error.message : 'Error uploading file');
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: query }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Unknown error occurred');
      }
      setResponse(data.response || data.message);
    } catch (error) {
      console.error('Error:', error);
      setResponse(`Error processing query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    setLoading(true);
    // Reset all quiz-related states
    setQuizSubmitted(false);
    setScore(null);
    setSelectedAnswers({});
    setShowExplanation({});
    
    try {
      const response = await fetch(`${getApiUrl()}/quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Server returned invalid quiz data format');
      }

      // Update type guard to match backend response
      const isValidQuizQuestion = (q: any): q is QuizQuestion => {
        return (
          typeof q === 'object' &&
          typeof q.status === 'string' &&
          typeof q.question_type === 'string' &&
          typeof q.question === 'string' &&
          Array.isArray(q.choices) &&
          typeof q.answer === 'string' &&
          typeof q.explanation === 'string'
        );
      };

      if (!data.every(isValidQuizQuestion)) {
        throw new Error('Invalid quiz question format received from server');
      }

      setQuizQuestions(data);
      setCurrentQuestionIndex(0);
    } catch (error) {
      console.error('Error:', error);
      setQuizQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const toggleExplanation = (questionIndex: number) => {
    setShowExplanation(prev => ({
      ...prev,
      [questionIndex]: !prev[questionIndex]
    }));
  };

  const handleSubmitQuiz = () => {
    const totalQuestions = quizQuestions.length;
    let correctAnswers = 0;

    quizQuestions.forEach((question, index) => {
      if (selectedAnswers[index] === question.answer) {
        correctAnswers++;
      }
    });

    setScore(correctAnswers);
    setQuizSubmitted(true);
    // Show all explanations after submission
    const allExplanations = quizQuestions.reduce((acc, _, index) => {
      acc[index] = true;
      return acc;
    }, {} as { [key: number]: boolean });
    setShowExplanation(allExplanations);
  };

  const isQuizComplete = () => {
    return quizQuestions.length > 0 && 
           Object.keys(selectedAnswers).length === quizQuestions.length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <motion.div 
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          className="w-80 bg-gray-800/50 backdrop-blur-xl border-r border-gray-700/50 p-6 fixed h-full"
        >
          <div className="h-full flex flex-col">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-2">Recall AI</h2>
              <h4 className="text-m text-white mb-2">Reading retention tool</h4>
              <p className="text-gray-400 text-sm">Upload your study material to begin</p>
            </div>
            
            <div className="space-y-4 flex-1">
              <div className="p-4 rounded-lg bg-gray-700/30 border border-gray-600/50 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Document Upload</h3>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border file:border-gray-500 file:text-sm file:font-medium file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600 file:transition-colors"
                />
                <button
                  onClick={handleFileUpload}
                  disabled={!file || loading}
                  className="mt-4 w-full bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? 'Processing...' : 'Upload Document'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <main className="flex-1 ml-80 p-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto space-y-8"
          >
            {/* Query Section */}
            <div className="p-6 rounded-xl bg-gray-800/50 backdrop-blur-xl border border-gray-700/50">
              <h2 className="text-xl font-bold text-white mb-4">Ask Your Question</h2>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What would you like to know?"
                  className="flex-1 bg-gray-700/50 border border-gray-600/50 text-white placeholder-gray-400 px-4 py-2 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
                <button
                  onClick={handleQuery}
                  disabled={!query.trim() || loading}
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Ask AI
                </button>
              </div>
            </div>

            {/* Response Section */}
            {response && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-xl bg-gray-800/50 backdrop-blur-xl border border-gray-700/50"
              >
                <h2 className="text-xl font-bold text-white mb-4">Response</h2>
                <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600/50">
                  <ReactMarkdown 
                    className="text-gray-200 whitespace-pre-wrap prose prose-invert prose-sm max-w-none"
                  >
                    {response}
                  </ReactMarkdown>
                </div>
              </motion.div>
            )}

            {/* Quiz Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-xl bg-gray-800/50 backdrop-blur-xl border border-gray-700/50"
            >
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={handleGenerateQuiz}
                  disabled={loading}
                  className="bg-secondary-600 text-white px-6 py-2 rounded-lg hover:bg-secondary-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Generate Quiz
                </button>
                {quizQuestions.length > 0 && (
                  <div className="text-gray-400">
                    Question {currentQuestionIndex + 1} of {quizQuestions.length}
                  </div>
                )}
              </div>

              {quizQuestions.length > 0 && (
                <div className="bg-gray-700/30 p-6 rounded-lg border border-gray-600/50">
                  <div className="space-y-6">
                    <motion.h3 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="font-bold text-xl text-white"
                    >
                      {quizQuestions[currentQuestionIndex].question}
                    </motion.h3>
                    
                    <div className="space-y-3">
                      {quizQuestions[currentQuestionIndex].choices.map((choice, choiceIndex) => (
                        <motion.div 
                          key={choiceIndex}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: choiceIndex * 0.1 }}
                          className={`relative`}
                        >
                          <input
                            type="radio"
                            name={`question-${currentQuestionIndex}`}
                            id={`choice-${currentQuestionIndex}-${choiceIndex}`}
                            value={choice}
                            checked={selectedAnswers[currentQuestionIndex] === choice}
                            onChange={() => handleAnswerSelect(currentQuestionIndex, choice)}
                            className="peer absolute opacity-0"
                          />
                          <label 
                            htmlFor={`choice-${currentQuestionIndex}-${choiceIndex}`}
                            className={`
                              block p-4 rounded-lg border border-gray-600/50
                              cursor-pointer transition-all duration-200
                              ${selectedAnswers[currentQuestionIndex] === choice 
                                ? 'bg-primary-600/20 border-primary-500/50 text-primary-300' 
                                : 'bg-gray-800/30 hover:bg-gray-700/30 text-gray-300 hover:text-white'
                              }
                              peer-checked:ring-2 peer-checked:ring-primary-500/50
                              peer-checked:border-primary-500/50
                            `}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`
                                w-5 h-5 rounded-full border-2 flex items-center justify-center
                                ${selectedAnswers[currentQuestionIndex] === choice 
                                  ? 'border-primary-500 bg-primary-500' 
                                  : 'border-gray-500'
                                }
                              `}>
                                {selectedAnswers[currentQuestionIndex] === choice && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-2 h-2 bg-white rounded-full"
                                  />
                                )}
                              </div>
                              <span className="text-sm md:text-base">{choice}</span>
                            </div>
                          </label>
                        </motion.div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-600/50">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-2 ${
                          !quizSubmitted && 'invisible'
                        }`}
                        onClick={() => toggleExplanation(currentQuestionIndex)}
                      >
                        {showExplanation[currentQuestionIndex] ? (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            Hide Answer
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            Show Answer
                          </>
                        )}
                      </motion.button>
                      
                      <div className="flex gap-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                          disabled={currentQuestionIndex === 0}
                          className="px-4 py-2 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Previous
                        </motion.button>
                        {currentQuestionIndex === quizQuestions.length - 1 ? (
                          isQuizComplete() && !quizSubmitted ? (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={handleSubmitQuiz}
                              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-500 transition-colors"
                            >
                              Submit Quiz
                            </motion.button>
                          ) : (
                            <button
                              disabled
                              className="px-4 py-2 rounded-lg bg-gray-600 text-white opacity-50 cursor-not-allowed"
                            >
                              {quizSubmitted ? 'Submitted' : 'Next'}
                            </button>
                          )
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setCurrentQuestionIndex(prev => Math.min(quizQuestions.length - 1, prev + 1))}
                            className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-500 transition-colors"
                          >
                            Next
                          </motion.button>
                        )}
                      </div>
                    </div>

                    {showExplanation[currentQuestionIndex] && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 p-4 rounded-lg bg-primary-900/30 border border-primary-500/20"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="font-semibold text-primary-300">
                            Correct Answer: {quizQuestions[currentQuestionIndex].answer}
                          </p>
                        </div>
                        <p className="text-gray-300 ml-7">
                          {quizQuestions[currentQuestionIndex].explanation}
                        </p>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Loading Indicator */}
            {loading && (
              <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center">
                <div className="p-8 rounded-lg bg-gray-800/90 shadow-xl">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
                  <p className="text-gray-300 mt-4">Processing your request...</p>
                </div>
              </div>
            )}

            {/* Add score display after submission */}
            {quizSubmitted && score !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 rounded-lg bg-gray-700/30 border border-gray-600/50"
              >
                <h3 className="text-xl font-bold text-white mb-2">
                  Quiz Results
                </h3>
                <p className="text-gray-300">
                  You got {score} out of {quizQuestions.length} questions correct! 
                  ({Math.round((score / quizQuestions.length) * 100)}%)
                </p>
              </motion.div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}