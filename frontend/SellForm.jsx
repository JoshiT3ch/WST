
import { useEffect, useRef, useState } from 'react';
import { requestApi, errorMessage } from './api.js';
import { ArrowIcon, CheckIcon } from './ui.jsx';
import {
  listingCategories as categories, listingConditions as conditions, listingAudiences as audiences,
  MAX_IMAGE_SIZE, itemNameError, validateListingFields
} from '../shared/listing-validation.js';

function imageError(file) {
  if (!file?.size) return 'Upload a photo of your item for your Finds listing.';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Choose a JPG, PNG, or WebP photo.';
  if (file.size > MAX_IMAGE_SIZE) return 'Choose a photo smaller than or equal to 5 MB.';
  return '';
}

function FieldError({ name, errors }) {
  return errors[name] ? <p className="field-error" id={`listing-${name}-error`}>{errors[name]}</p> : null;
}

export function SellForm() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [created, setCreated] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const pending = useRef(null);
  const successPanel = useRef(null);
  const errorPanel = useRef(null);
  const busy = status === 'sending';
  const formError = error || (status === 'error' && Object.keys(fieldErrors).length
    ? 'Check the highlighted fields before listing your item on Finds.' : '');

  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    if (status === 'success') successPanel.current?.focus();
  }, [status]);
  useEffect(() => {
    if (!selectedImage) {
      setImagePreview('');
      return;
    }
    const url = URL.createObjectURL(selectedImage);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedImage]);

  function validationProps(name, helpId) {
    return {
      'aria-invalid': fieldErrors[name] ? true : undefined,
      'aria-describedby': [helpId, fieldErrors[name] ? `listing-${name}-error` : ''].filter(Boolean).join(' ') || undefined
    };
  }

  function updateFieldError(name, message = '') {
    setFieldErrors(previous => {
      const next = { ...previous };
      if (message) next[name] = message;
      else delete next[name];
      return next;
    });
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];
    const message = imageError(file);
    updateFieldError('image', message);
    setSelectedImage(message ? null : file);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    if (name === 'image') return;
    if (fieldErrors[name]) updateFieldError(name, name === 'title' ? itemNameError(value) : '');
  }

  async function submit(event) {
    event.preventDefault();

    if (pending.current) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const validation = validateListingFields({ ...Object.fromEntries(data), audiences: data.getAll('audiences') });
    const errors = { ...validation.fieldErrors };
    const photoError = imageError(data.get('image'));
    if (photoError) errors.image = photoError;
    setFieldErrors(errors);

    if (Object.keys(errors).length) {
      setStatus('error');
      setError('');
      requestAnimationFrame(() => form.querySelector('input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"]')?.focus());
      return;
    }

    const controller = new AbortController();
    pending.current = controller;
    setStatus('sending');
    setError('');
    try {
      const result = await requestApi('/api/products', {
        method: 'POST',
        body: data,
        signal: controller.signal
      });
      if (controller.signal.aborted) return;
      setCreated(result.product);
      setStatus('success');
      form.reset();
      setSelectedImage(null);
    } catch (requestError) {
      if (controller.signal.aborted) return;
      setStatus('error');
      setError(requestError.fieldErrors ? '' : errorMessage(requestError));
      setFieldErrors(requestError.fieldErrors || {});
      requestAnimationFrame(() => errorPanel.current?.focus());
    } finally {
      pending.current = null;
    }
  }

  function resetForm() {
    setCreated(null);
    setError('');
    setFieldErrors({});
    setStatus('idle');
    setSelectedImage(null);
    requestAnimationFrame(() => document.querySelector('#listing-title')?.focus());
  }

  if (status === 'success' && created) {
    return (
      <section
        ref={successPanel}
        className="contact-form-panel form-success sell-success-compact"
        aria-live="polite"
        tabIndex="-1"
      >
        <div className="sell-success-heading">
          <span className="success-icon">
            <CheckIcon />
          </span>

          <div>
            <p className="eyebrow">LISTING CREATED</p>
            <h2 id="sell-form-title">Your item is listed!</h2>
          </div>
        </div>

        <p>
          <strong>{created.title}</strong> has been added to the Finds catalogue.
        </p>

        <p className="sell-success-price">
          Listed price: ₱{Number(created.price).toLocaleString('en-PH')}
        </p>

        <div className="sell-actions">
          <a className="button" href="index.html#featured">
            Browse the catalogue <ArrowIcon />
          </a>

          <button
            className="button button-secondary"
            type="button"
            onClick={resetForm}
          >
            List another item
          </button>
        </div>
      </section>
    );
  }

  return (
    <form
      className="contact-form-panel sell-form"
      onSubmit={submit}
      onChange={handleChange}
      noValidate
      aria-busy={busy}
      aria-labelledby="sell-form-title"
      aria-describedby="form-note"
    >
      <p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>
      <h2 id="sell-form-title">List an item</h2>

      <p id="form-note">
        Share a few details about the piece you're passing along.
        Fields marked * are required.
      </p>

      {formError && (
        <p ref={errorPanel} className="sell-error" role="alert" tabIndex={-1}>
          {formError}
        </p>
      )}

      <div className="field">
        <label htmlFor="listing-title">Item name *</label>
        <input
          id="listing-title"
          name="title"
          required
          minLength="1"
          maxLength="100"
          {...validationProps('title', 'listing-title-help')}
          onBlur={event => updateFieldError('title', itemNameError(event.target.value))}
          placeholder="e.g. Vintage denim jacket"
          disabled={busy}
        />
        <p className="field-help" id="listing-title-help">Letters and spaces only, up to 100 characters.</p>
        <FieldError name="title" errors={fieldErrors} />
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="listing-category">Category *</label>
          <select
            id="listing-category"
            name="category"
            required
            defaultValue=""
            {...validationProps('category')}
            disabled={busy}
          >
            <option value="" disabled>Select a category</option>
            {categories.map(value => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <FieldError name="category" errors={fieldErrors} />
        </div>

        <div className="field">
          <label htmlFor="listing-price">Price (PHP) *</label>
          <input
            id="listing-price"
            name="price"
            type="number"
            min="1"
            max="10000000"
            step="1"
            required
            placeholder="e.g. 650"
            {...validationProps('price')}
            disabled={busy}
          />
          <FieldError name="price" errors={fieldErrors} />
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="listing-size">Size *</label>
          <input
            id="listing-size"
            name="size"
            required
            maxLength="40"
            placeholder="e.g. Medium, EU 38, One size"
            {...validationProps('size')}
            disabled={busy}
          />
          <FieldError name="size" errors={fieldErrors} />
        </div>

        <div className="field">
          <label htmlFor="listing-condition">Condition *</label>
          <select
            id="listing-condition"
            name="condition"
            required
            defaultValue=""
            {...validationProps('condition')}
            disabled={busy}
          >
            <option value="" disabled>Select condition</option>
            {conditions.map(value => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <FieldError name="condition" errors={fieldErrors} />
        </div>
      </div>

      <fieldset className="field audience-field" disabled={busy} {...validationProps('audiences', 'listing-audiences-help')}>
        <legend>Who is this item for? *</legend>

        <div className="audience-options">
          {audiences.map(value => (
            <label key={value}>
              <input
                type="checkbox"
                name="audiences"
                value={value}
                {...validationProps('audiences', 'listing-audiences-help')}
              />{' '}
              {value}
            </label>
          ))}
        </div>

        <p className="field-help" id="listing-audiences-help">Choose who the item is for. Select multiple audiences only if it suits each one.</p>
        <FieldError name="audiences" errors={fieldErrors} />
      </fieldset>

      <div className="field">
        <label htmlFor="listing-description">Description *</label>
        <textarea
          id="listing-description"
          name="description"
          required
          minLength="10"
          maxLength="1000"
          rows="5"
          placeholder="Describe the item, fit, material, or anything buyers should know."
          {...validationProps('description', 'listing-description-help')}
          disabled={busy}
        />

        <p className="field-help" id="listing-description-help">10–1,000 characters.</p>
        <FieldError name="description" errors={fieldErrors} />
      </div>

      <div className="field">
        <label htmlFor="listing-image">Upload item photo *</label>
        <input
          id="listing-image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          onChange={handleImageChange}
          {...validationProps('image', 'listing-image-help')}
          disabled={busy}
        />

        <p className="field-help" id="listing-image-help">
          Upload a JPG, PNG, or WebP image. Maximum file size: 5 MB.
        </p>
        <FieldError name="image" errors={fieldErrors} />

        {imagePreview && (
          <div className="sell-image-preview">
            <img src={imagePreview} alt="Preview of your item" />
          </div>
        )}
      </div>

      <button className="button" type="submit" disabled={busy}>
        {busy ? 'Saving your listing…' : 'Create listing'} <ArrowIcon />
      </button>

      <p className="privacy-note">
        Your listing will be saved to the catalogue. This classroom prototype
        does not yet have seller accounts, checkout, or payments.
      </p>
    </form>
  );
}
