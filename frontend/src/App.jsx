import { useState, useCallback } from 'react'
import { init } from '@instantdb/react'
import { processNotes, evaluateQuiz } from './api'
import { Login } from './components/Login'
import './App.css'

// Initialize InstantDB
const APP_ID = 'a4ede1af-d538-4007-b058-4a2a33f52401'
export const db = init({ appId: APP_ID })

const SCREENS = { INPUT: 'input', PROCESSING: 'processing', LEARNING: 'learning', QUIZ: 'quiz', RESULTS: 'results' }

function App() {
  const { isLoading, user, error: authError } = db.useAuth()
  const [screen, setScreen] = useState(SCREENS.INPUT)
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [processingStep, setProcessingStep] = useState(0)
  const [result, setResult] = useState(null) // { unifiedExplanation, readingTimeMinutes, questions }
  const [quizAnswers, setQuizAnswers] = useState([]) // [{ id, type, question, userAnswer, options?, correctIndex?, expectedKeywords? }]
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [evaluation, setEvaluation] = useState(null)

  const steps = ['Generating perspectives…', 'Synthesizing understanding…', 'Creating quiz…']

  const handleGenerate = useCallback(async () => {
    setError('')
    if (!text.trim() && !file) {
      setError('Paste some notes or upload a PDF.')
      return
    }
    setScreen(SCREENS.PROCESSING)
    setProcessingStep(0)
    const stepInterval = setInterval(() => {
      setProcessingStep((i) => Math.min(i + 1, steps.length - 1))
    }, 2500)
    try {
      const data = await processNotes({
        text: text.trim() || undefined,
        file,
        token: user.refresh_token // Pass the refresh token as auth token
      })
      clearInterval(stepInterval)
      setProcessingStep(steps.length - 1)
      setResult(data)
      setQuizAnswers(
        data.questions.map((q) => ({
          id: q.id,
          type: q.type,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          expectedKeywords: q.expectedKeywords,
          userAnswer: q.type === 'mcq' ? null : '',
        }))
      )
      setCurrentQuestionIndex(0)
      setEvaluation(null)
      setScreen(SCREENS.LEARNING)
    } catch (e) {
      clearInterval(stepInterval)
      setError(e.message || 'Something went wrong.')
      setScreen(SCREENS.INPUT)
    }
  }, [text, file, user])

  const startQuiz = () => setScreen(SCREENS.QUIZ)

  const setAnswer = (questionId, value) => {
    setQuizAnswers((prev) =>
      prev.map((a) => (a.id === questionId ? { ...a, userAnswer: value } : a))
    )
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < result.questions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1)
    }
  }

  const submitQuiz = async () => {
    const payload = quizAnswers.map((a) => {
      const q = result.questions.find((x) => x.id === a.id)
      const userAnswer =
        a.type === 'mcq' && q?.options && typeof a.userAnswer === 'number'
          ? q.options[a.userAnswer]
          : (a.userAnswer ?? '')
      return {
        id: a.id,
        type: a.type,
        question: a.question,
        userAnswer,
        options: a.options,
        correctIndex: a.correctIndex,
        expectedKeywords: a.expectedKeywords,
      }
    })
    try {
      const evalResult = await evaluateQuiz(payload)
      setEvaluation(evalResult)
      setScreen(SCREENS.RESULTS)
    } catch (e) {
      setError(e.message || 'Evaluation failed.')
    }
  }

  const currentQ = result?.questions?.[currentQuestionIndex]
  const currentAnswer = quizAnswers.find((a) => a.id === currentQ?.id)

  const resetToInput = () => {
    setScreen(SCREENS.INPUT)
    setError('')
    setResult(null)
    setEvaluation(null)
  }

  const regenerateExplanation = () => {
    setScreen(SCREENS.LEARNING)
    setEvaluation(null)
  }

  if (isLoading) {
    return <div className="app">Loading...</div>
  }

  if (authError) {
    return <div className="app">Error: {authError.message}</div>
  }

  if (!user) {
    return (
      <div className="app">
        <header className="card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>MetaNotes AI</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.9rem' }}>
            Turn notes into one clear explanation + a short quiz
          </p>
        </header>
        <Login />
      </div>
    )
  }

  return (
    <div className="app">
      <header className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>MetaNotes AI</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.9rem' }}>
            Turn notes into one clear explanation + a short quiz
          </p>
        </div>
        <button onClick={() => db.auth.signOut()} style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>
          Sign Out
        </button>
      </header>

      {error && (
        <div className="error-msg" role="alert">
          {error}
        </div>
      )}

      {screen === SCREENS.INPUT && (
        <InputScreen
          text={text}
          setText={setText}
          file={file}
          setFile={setFile}
          onGenerate={handleGenerate}
        />
      )}

      {screen === SCREENS.PROCESSING && (
        <ProcessingScreen steps={steps} currentStep={processingStep} />
      )}

      {screen === SCREENS.LEARNING && result && (
        <LearningScreen
          unifiedExplanation={result.unifiedExplanation}
          readingTimeMinutes={result.readingTimeMinutes}
          onStartQuiz={startQuiz}
        />
      )}

      {screen === SCREENS.QUIZ && result && (
        <QuizScreen
          questions={result.questions}
          currentIndex={currentQuestionIndex}
          setCurrentQuestionIndex={setCurrentQuestionIndex}
          quizAnswers={quizAnswers}
          setAnswer={setAnswer}
          nextQuestion={nextQuestion}
          submitQuiz={submitQuiz}
        />
      )}

      {screen === SCREENS.RESULTS && evaluation && (
        <ResultsScreen
          evaluation={evaluation}
          onRegenerate={regenerateExplanation}
          onStartOver={resetToInput}
        />
      )}
    </div>
  )
}

function InputScreen({ text, setText, file, setFile, onGenerate }) {
  return (
    <>
      <div className="card">
        <div className="section-label">Your notes</div>
        <p style={{ margin: '0 0 0.5rem', color: '#666', fontSize: '0.9rem' }}>
          Paste text below or upload a PDF.
        </p>
        <textarea
          placeholder="Paste study notes here…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!!file}
        />
        <div style={{ marginTop: '0.75rem' }}>
          <label style={{ fontSize: '0.9rem' }}>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {/* Remove space as it text node */}
            {' '}Upload PDF
          </label>
          {file && (
            <span style={{ marginLeft: '0.5rem', color: '#666' }}>{file.name}</span>
          )}
        </div>
        <button
          className="primary"
          style={{ marginTop: '1rem' }}
          onClick={onGenerate}
        >
          Generate Understanding
        </button>
      </div>
    </>
  )
}

function ProcessingScreen({ steps, currentStep }) {
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Processing</h2>
      <div className="progress-steps">
        {steps.map((label, i) => (
          <div
            key={i}
            className={`progress-step ${i < currentStep ? 'done' : i === currentStep ? 'active' : ''}`}
          >
            {i < currentStep ? '✓' : i === currentStep ? '…' : '○'} {label}
          </div>
        ))}
      </div>
    </div>
  )
}

function LearningScreen({ unifiedExplanation, readingTimeMinutes, onStartQuiz }) {
  const sections = parseExplanationSections(unifiedExplanation)
  return (
    <>
      <div className="card">
        <div className="reading-time">Reading time: ~{readingTimeMinutes} min</div>
      </div>
      {sections.length > 0
        ? sections.map((s, i) => (
          <div key={i} className="card">
            <div className="section-label">{s.label}</div>
            <div className="explanation-block">{s.body}</div>
          </div>
        ))
        : (
          <div className="card">
            <div className="explanation-block">{unifiedExplanation}</div>
          </div>
        )}
      <div className="card">
        <button className="primary" onClick={onStartQuiz}>
          Start Quiz
        </button>
      </div>
    </>
  )
}

function parseExplanationSections(text) {
  const labels = ['TITLE', 'CORE IDEA', 'KEY POINTS', 'ONE EXAMPLE', 'IMPORTANT NOTE']
  const sections = []
  let rest = text
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]
    const nextLabel = labels[i + 1]
    const start = rest.indexOf(label)
    if (start === -1) continue
    const bodyStart = start + label.length
    const bodyEnd = nextLabel
      ? rest.indexOf(nextLabel, bodyStart)
      : rest.length
    const body = rest.slice(bodyStart, bodyEnd < 0 ? undefined : bodyEnd).trim()
    if (body) sections.push({ label, body })
    rest = bodyEnd >= 0 ? rest.slice(bodyEnd) : ''
  }
  return sections
}

function QuizScreen({
  questions,
  currentIndex,
  setCurrentQuestionIndex,
  quizAnswers,
  setAnswer,
  nextQuestion,
  submitQuiz,
}) {
  const q = questions[currentIndex]
  const answer = quizAnswers.find((a) => a.id === q.id)
  const isLast = currentIndex === questions.length - 1
  const canProceed =
    q.type === 'mcq' ? answer?.userAnswer != null : (answer?.userAnswer ?? '').trim() !== ''

  return (
    <div className="card">
      <div className="section-label">
        Question {currentIndex + 1} of {questions.length}
      </div>
      <div className="quiz-question">
        <strong>{q.question}</strong>
        {q.type === 'mcq' && q.options && (
          <ul className="quiz-options">
            {q.options.map((opt, i) => (
              <li
                key={i}
                className={answer?.userAnswer === i ? 'selected' : ''}
                onClick={() => setAnswer(q.id, i)}
              >
                {opt}
              </li>
            ))}
          </ul>
        )}
        {(q.type === 'short' || q.type === 'application') && (
          <input
            type="text"
            placeholder="Your answer…"
            value={answer?.userAnswer ?? ''}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            style={{ marginTop: '0.5rem' }}
          />
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        {currentIndex > 0 && (
          <button onClick={() => setCurrentQuestionIndex((i) => i - 1)}>Previous</button>
        )}
        {!isLast ? (
          <button className="primary" onClick={nextQuestion} disabled={!canProceed}>
            Next
          </button>
        ) : (
          <button className="primary" onClick={submitQuiz} disabled={!canProceed}>
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  )
}

function ResultsScreen({ evaluation, onRegenerate, onStartOver }) {
  const { score, maxScore, strengths, weakAreas, overallComment, feedback } = evaluation
  return (
    <>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Results</h2>
        <div className="results-score">
          {score} / {maxScore ?? 5}
        </div>

        {evaluation.topicUnderstandingPercentage !== undefined && (
          <div style={{ margin: '1rem 0', textAlign: 'center' }}>
            <div className="section-label">Topic Understanding</div>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: evaluation.topicUnderstandingPercentage >= 70 ? '#10b981' : '#f59e0b'
            }}>
              {evaluation.topicUnderstandingPercentage}%
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: '#eee',
              borderRadius: '4px',
              marginTop: '0.5rem',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${evaluation.topicUnderstandingPercentage}%`,
                height: '100%',
                background: evaluation.topicUnderstandingPercentage >= 70 ? '#10b981' : '#f59e0b',
                transition: 'width 0.5s ease-out'
              }} />
            </div>
          </div>
        )}

        {overallComment && <p style={{ margin: '0.5rem 0' }}>{overallComment}</p>}
        {strengths?.length > 0 && (
          <>
            <div className="section-label">Strengths</div>
            <ul className="results-list">
              {strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </>
        )}
        {weakAreas?.length > 0 && (
          <>
            <div className="section-label">Areas to review</div>
            <ul className="results-list">
              {weakAreas.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </>
        )}
        {feedback?.length > 0 && (
          <>
            <div className="section-label">Feedback by question</div>
            <ul style={{ paddingLeft: '1.25em', margin: '0.5rem 0' }}>
              {feedback.map((f, i) => (
                <li key={i} style={{ marginBottom: '0.25rem' }}>
                  {f.correct ? '✓' : '✗'} {f.comment}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="card" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button className="primary" onClick={onRegenerate}>
          Back to explanation
        </button>
        <button onClick={onStartOver}>Start over</button>
      </div>
    </>
  )
}

export default App
