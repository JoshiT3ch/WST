
import { useState } from 'react';
import { requestApi, errorMessage } from './api.js';
import { ArrowIcon, CheckIcon } from './ui.jsx';

const categories = ['Clothing', 'Shoes', 'Accessories', 'Bags', 'Home', 'Kids', 'Other'];
const conditions = ['New', 'Like new', 'Good', 'Fair'];
const audiences = ['Woman', 'Men', 'Kids'];

export function SellForm() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImagePreview(file ? URL.createObjectURL(file) : '');
  }

  async function submit(event) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setStatus('sending');
    setError('');

    const form = event.currentTarget;
    const data = new FormData(form);
    const selectedImage = data.get('image');
    const selectedAudiences = data.getAll('audiences');

    if (!selectedAudiences.length) {
      setStatus('error');
      setError('Choose at least one audience for your listing.');
      setBusy(false);
      return;
    }

    if (!(selectedImage instanceof File) || selectedImage.size === 0) {
      setStatus('error');
      setError('Please upload a photo of your item.');
      setBusy(false);
      return;
    }

    try {
      const result = await requestApi('/api/products', {
        method: 'POST',
        body: data
      });

      setCreated(result.product);
      setStatus('success');
      form.reset();

      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }

      setImagePreview('');
    } catch (requestError) {
      setStatus('error');
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    setCreated(null);
    setError('');
    setStatus('idle');

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImagePreview('');
  }

  if (status === 'success' && created) {
    return (
      <section
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
      aria-labelledby="sell-form-title"
    >
      <p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>
      <h2 id="sell-form-title">List an item</h2>

      <p id="form-note">
        Share a few details about the piece you're passing along.
        Fields marked * are required.
      </p>

      {status === 'error' && (
        <p className="sell-error" role="alert">
          {error}
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
          placeholder="e.g. Vintage denim jacket"
          disabled={busy}
        />
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="listing-category">Category *</label>
          <select
            id="listing-category"
            name="category"
            required
            defaultValue=""
            disabled={busy}
          >
            <option value="" disabled>Select a category</option>
            {categories.map(value => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
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
            disabled={busy}
          />
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
            disabled={busy}
          />
        </div>

        <div className="field">
          <label htmlFor="listing-condition">Condition *</label>
          <select
            id="listing-condition"
            name="condition"
            required
            defaultValue=""
            disabled={busy}
          >
            <option value="" disabled>Select condition</option>
            {conditions.map(value => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="field audience-field" disabled={busy}>
        <legend>Who is this item for? *</legend>

        <div className="audience-options">
          {audiences.map((value, index) => (
            <label key={value}>
              <input
                type="checkbox"
                name="audiences"
                value={value}
                defaultChecked={index < 2}
              />{' '}
              {value}
            </label>
          ))}
        </div>

        <p className="field-help">Select at least one audience.</p>
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
          disabled={busy}
        />

        <p className="field-help">10–1,000 characters.</p>
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
          disabled={busy}
        />

        <p className="field-help">
          Upload a JPG, PNG, or WebP image. Maximum file size: 5 MB.
        </p>

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
