import { useEffect, useRef, useState } from 'react';
import { requestApi, errorMessage } from './api.js';
import { ArrowIcon, CheckIcon } from './ui.jsx';

const topics = [
  ['buying', 'Buying on Finds'], ['selling', 'Selling on Finds'], ['listing', 'Listing help'],
  ['account', 'Account support'], ['feedback', 'Feedback on Finds'], ['general', 'General question'], ['other', 'Something else']
];

export function ContactForm() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const successPanel = useRef(null);
  const errorPanel = useRef(null);
  const nameInput = useRef(null);
  const pending = useRef(null);

  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    if (status === 'success') successPanel.current?.focus();
    else if (status === 'error') errorPanel.current?.focus();
  }, [status]);

  function validateText(event) {
    const input = event.target;
    if (input.name === 'name') input.setCustomValidity(input.value.trim() ? '' : 'Please enter your name.');
    if (input.name === 'message') input.setCustomValidity(input.value.trim().length >= 10 ? '' : 'Please enter a message with at least 10 characters.');
  }

  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    if (!fields.name.trim() || fields.message.trim().length < 10) {
      setError('Please enter your name and a message with at least 10 characters.');
      setStatus('error');
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setStatus('sending');
    setError('');
    try {
      await requestApi('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields), signal: controller.signal
      });
      if (!controller.signal.aborted) {
        form.reset();
        setStatus('success');
      }
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setError(errorMessage(requestError));
        setStatus('error');
      }
    } finally {
      pending.current = null;
    }
  }

  function tryAgain() {
    setStatus('idle');
    setError('');
    // The form stays mounted, so its name field is available after revealing it.
    requestAnimationFrame(() => nameInput.current?.focus());
  }

  const sending = status === 'sending';
  return <>
    <form id="contact-form" aria-describedby="form-note" aria-busy={sending} onSubmit={submit} onInput={validateText} hidden={status === 'success'}>
      <h2>How can we help?</h2>
      <p id="form-note">Tell us a little about what you need. Fields marked * are required.</p>
      <div className="form-row">
        <div className="field"><label htmlFor="name">Your name *</label><input ref={nameInput} id="name" name="name" autoComplete="name" placeholder="e.g. Alex Santos" required maxLength={80} disabled={sending} /></div>
        <div className="field"><label htmlFor="email">Email address *</label><input id="email" name="email" type="email" autoComplete="email" placeholder="alex@example.com" required maxLength={120} disabled={sending} /></div>
      </div>
      <div className="field"><label htmlFor="topic">What’s on your mind? *</label><select id="topic" name="topic" required defaultValue="" disabled={sending}>
        <option value="">Choose a topic</option>
        {topics.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></div>
      <div className="field"><label htmlFor="message">Your message *</label><textarea id="message" name="message" rows={5} placeholder="Tell us how we can help…" required minLength={10} maxLength={2000} disabled={sending} /><span className="field-help">At least 10 characters.</span></div>
      <button className="button" type="submit" disabled={sending}>{sending ? 'Sending message…' : 'Send message'} <ArrowIcon /></button>
      <p ref={errorPanel} id="form-error" role="alert" tabIndex={-1} hidden={!error}>{error}</p>
      <p className="privacy-note">Your name, email, topic, and message are saved by Finds.</p>
    </form>
    <section ref={successPanel} id="form-success" className="form-success" tabIndex={-1} aria-labelledby="success-title" hidden={status !== 'success'}>
      <span className="success-icon"><CheckIcon /></span>
      <span className="eyebrow">MESSAGE RECEIVED</span>
      <h2 id="success-title">Thanks for saying hello.</h2>
      <p>Your message has been received and saved for the Finds team.</p>
      <div className="demo-panel"><strong>We have your message.</strong><p>This confirmation means your message was saved. An automatic email reply is not sent.</p></div>
      <button id="try-again" className="button" type="button" onClick={tryAgain}>Try another message <ArrowIcon /></button>
    </section>
  </>;
}
