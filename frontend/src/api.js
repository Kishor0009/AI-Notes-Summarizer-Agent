const API_BASE = ''

export async function processNotes({ text, file, token }) {
  const form = new FormData()
  if (text && text.trim()) form.append('text', text.trim())
  if (file) form.append('file', file)
  const res = await fetch(`${API_BASE}/api/process`, {
    method: 'POST',
    body: form,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const detail = Array.isArray(err.detail) ? err.detail[0] : err.detail
    throw new Error(detail || res.statusText || 'Processing failed')
  }
  return res.json()
}

export async function evaluateQuiz(questionsWithAnswers) {
  const res = await fetch(`${API_BASE}/api/evaluate-quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionsWithAnswers }),
  })
  if (!res.ok) throw new Error('Evaluation failed')
  return res.json()
}
