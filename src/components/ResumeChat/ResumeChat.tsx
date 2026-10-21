import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { profile } from '../../data';
import Icon from '../Icon/Icon';
import SectionKicker from '../SectionKicker/SectionKicker';
import './ResumeChat.css';

const MAX_QUESTION_LENGTH = 1500;
const suggestions = [
  'What frontend skills are listed?',
  'What experience does Joi have with React?',
  'Which testing tools has Joi used?',
];

interface Source {
  id: string;
  text: string;
}

interface ChatResponse {
  answer: string;
  status: 'answered' | 'insufficient_evidence';
  sources: Source[];
}

interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Message extends HistoryMessage {
  id: number;
  sources?: Source[];
  status?: ChatResponse['status'];
}

interface FailedRequest {
  message: string;
  history: HistoryMessage[];
}

class ChatRequestError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isChatResponse(value: unknown): value is ChatResponse {
  if (!isRecord(value)
    || typeof value.answer !== 'string'
    || !value.answer.trim()
    || value.answer.length > 37000
    || (value.status !== 'answered' && value.status !== 'insufficient_evidence')
    || !Array.isArray(value.sources)
    || value.sources.length > 12) return false;

  if (value.status === 'answered' && value.sources.length === 0) return false;

  return value.sources.every((source: unknown) => isRecord(source)
    && typeof source.id === 'string'
    && source.id.trim().length > 0
    && typeof source.text === 'string'
    && source.text.trim().length > 0
    && source.text.length <= 12000);
}

function responseError(status: number): string {
  if (status === 429) return 'The assistant has received too many questions. Please wait a moment and retry.';
  if (status === 400 || status === 413) return 'Please keep your question under 1,500 characters and try again.';
  if (status === 503) return 'The portfolio assistant is unavailable. Please try again later or open the resume.';
  return 'The assistant could not answer this time. Please retry or open the resume.';
}

function ResumeChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [failedRequest, setFailedRequest] = useState<FailedRequest | null>(null);
  const request = useRef<AbortController | null>(null);
  const messageId = useRef(0);
  const transcript = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const followConversation = useRef(true);

  useEffect(() => () => {
    request.current?.abort();
    request.current = null;
  }, []);

  useEffect(() => {
    if (followConversation.current && transcript.current) {
      transcript.current.scrollTop = transcript.current.scrollHeight;
    }
  }, [messages, pending]);

  async function askQuestion(question: string, retry = false) {
    const message = question.trim();
    if (!message || message.length > MAX_QUESTION_LENGTH || request.current) return;

    // Only completed exchanges become context; a failed question is never sent twice.
    const completedHistory = messages.flatMap((entry, index): HistoryMessage[] => {
      const question = messages[index - 1];
      return entry.role === 'assistant' && question?.role === 'user'
        ? [{ role: 'user', content: question.content }, { role: 'assistant', content: entry.content }]
        : [];
    });
    const history: HistoryMessage[] = retry && failedRequest
      ? failedRequest.history
      : completedHistory.slice(-6).map((entry) => ({
        role: entry.role,
        content: entry.content.slice(0, 2000),
      }));
    const controller = new AbortController();
    request.current = controller;
    followConversation.current = true;
    setPending(true);
    setError('');
    setFailedRequest(null);

    if (!retry) {
      setMessages((previous) => [...previous, { id: ++messageId.current, role: 'user', content: message }]);
      setDraft('');
    }
    input.current?.focus();

    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 60000);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
        signal: controller.signal,
      });

      if (!response.ok) throw new ChatRequestError(responseError(response.status));

      let result: unknown;
      try {
        result = await response.json();
      } catch {
        throw new ChatRequestError('The assistant returned an unreadable response. Please retry or open the resume.');
      }

      if (!isChatResponse(result)) {
        throw new ChatRequestError('No verifiable response was returned. Please retry or open the resume.');
      }
      if (request.current !== controller) return;

      setMessages((previous) => [...previous, {
        id: ++messageId.current,
        role: 'assistant',
        content: result.answer,
        sources: result.sources,
        status: result.status,
      }]);
    } catch (cause: unknown) {
      if (request.current !== controller || (controller.signal.aborted && !timedOut)) return;
      setError(timedOut
        ? 'The assistant took too long to respond. Please retry or open the resume.'
        : cause instanceof ChatRequestError
          ? cause.message
          : 'Could not reach the portfolio assistant. Check your connection and retry, or open the resume.');
      setFailedRequest({ message, history });
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setPending(false);
      }
    }
  }

  function resetConversation() {
    request.current?.abort();
    request.current = null;
    setMessages([]);
    setDraft('');
    setPending(false);
    setError('');
    setFailedRequest(null);
    followConversation.current = true;
    input.current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askQuestion(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void askQuestion(draft);
    }
  }

  return (
    <section className="resume-chat-section section" id="resume-chat" aria-labelledby="resume-chat-heading">
      <div className="container">
        <SectionKicker number="04" label="A CLOSER LOOK" />
        <div className="resume-chat-layout">
          <div className="resume-chat-intro">
            <h2 id="resume-chat-heading">Curious about<br /><em>the details?</em></h2>
            <p>Ask about my experience, skills, or education. This assistant finds relevant information about my background, with sources you can check.</p>
            <a className="text-link resume-chat-resume-link" href={profile.resumeUrl} target="_blank" rel="noopener noreferrer">
              Open my resume <Icon name="arrow-up" />
            </a>
            <div className="resume-chat-note">
              <span className="resume-chat-note-icon"><Icon name="layers" /></span>
              <div>
                <strong>Answers come from my portfolio information.</strong>
                <p>Answers use supporting passages. When the available information doesn&apos;t answer your question, the assistant will say so. Check the sources for context and dates.</p>
              </div>
            </div>
          </div>

          <div className="resume-chat-panel">
            <div className="resume-chat-header">
              <div className="resume-chat-identity">
                <span className="resume-chat-avatar" aria-hidden="true"><Icon name="code" /></span>
                <div><h3>Portfolio assistant</h3><span>Questions, with a source.</span></div>
              </div>
              <button
                className="resume-chat-reset"
                type="button"
                onClick={resetConversation}
                disabled={!messages.length && !draft && !error}
                aria-label={pending ? 'Cancel response and clear conversation' : 'Clear conversation'}
              >
                {pending ? 'Cancel & clear' : 'Clear chat'}
              </button>
            </div>

            <div
              className="resume-chat-transcript"
              ref={transcript}
              role="log"
              aria-label="Portfolio conversation"
              aria-live="polite"
              aria-relevant="additions"
              tabIndex={0}
              onScroll={() => {
                const log = transcript.current;
                if (log) followConversation.current = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
              }}
            >
              {messages.length === 0 && (
                <div className="resume-chat-welcome">
                  <span className="eyebrow">START WITH A QUESTION</span>
                  <p>A little more about<br /><em>the person behind the code.</em></p>
                  <span>Explore my experience, skills, and education.</span>
                  <div className="resume-chat-suggestions">
                    {suggestions.map((question) => (
                      <button key={question} type="button" onClick={() => void askQuestion(question)} disabled={pending}>
                        {question} <Icon name="arrow-up" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <article className={`resume-chat-message resume-chat-message-${message.role}`} key={message.id}>
                  <span className="resume-chat-message-label">{message.role === 'user' ? 'YOU' : 'PORTFOLIO ASSISTANT'}</span>
                  <p>{message.content}</p>
                  {message.status === 'insufficient_evidence' && (
                    <span className="resume-chat-evidence-note">The available portfolio information does not provide enough evidence for this answer.</span>
                  )}
                  {message.sources && message.sources.length > 0 && (
                    <details className="resume-chat-sources">
                      <summary>View {message.sources.length === 1 ? 'source' : `${message.sources.length} sources`} <Icon name="chevron" /></summary>
                      <ol>
                        {message.sources.map((source, index) => (
                          <li key={`${source.id}-${index}`}>
                            <span className="resume-chat-message-label">[{index + 1}] Source passage</span>
                            <blockquote>{source.text}</blockquote>
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                </article>
              ))}

              {pending && (
                <div className="resume-chat-loading">
                  <span className="resume-chat-loading-dots" aria-hidden="true"><i /><i /><i /></span>
                  Finding relevant information…
                </div>
              )}
            </div>

            {error && (
              <div className="resume-chat-error" role="alert">
                <p>{error}</p>
                {failedRequest && <button type="button" onClick={() => void askQuestion(failedRequest.message, true)} disabled={pending}>Retry question <Icon name="arrow" /></button>}
              </div>
            )}

            <form className="resume-chat-composer" onSubmit={handleSubmit}>
              <label htmlFor="resume-chat-question">Your question</label>
              <div className="resume-chat-input-row">
                <textarea
                  ref={input}
                  id="resume-chat-question"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What would you like to know?"
                  maxLength={MAX_QUESTION_LENGTH}
                  rows={2}
                  readOnly={pending}
                  aria-describedby="resume-chat-help"
                  autoComplete="off"
                />
                <button className="resume-chat-send" type="submit" disabled={pending || !draft.trim()} aria-label="Send question">
                  <Icon name="arrow" />
                </button>
              </div>
              <div className="resume-chat-input-help">
                <span id="resume-chat-help">Enter to send · Shift + Enter for a new line</span>
                <span aria-label={`${draft.length} of ${MAX_QUESTION_LENGTH} characters`}>{draft.length.toLocaleString()} / 1,500</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ResumeChat;
