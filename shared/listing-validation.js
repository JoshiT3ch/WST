export const listingCategories = ['Clothing', 'Shoes', 'Accessories', 'Bags', 'Home', 'Kids', 'Other'];
export const listingConditions = ['New', 'Like new', 'Good', 'Fair'];
export const listingAudiences = ['Woman', 'Men', 'Kids'];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function itemNameError(value) {
  const title = typeof value === 'string' ? value.trim() : '';
  if (!title) return 'Enter an item name for your Finds listing.';
  if (title.length > 100) return 'Keep the item name to 100 characters or fewer.';
  if (!/^\p{L}[\p{L}\p{M}]*(?: +\p{L}[\p{L}\p{M}]*)*$/u.test(title)) {
    return 'Use letters and spaces only for the item name; numbers and symbols are not allowed.';
  }
  return '';
}

// Used by the listing form and API so both enforce the same rules.
export function validateListingFields(body) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const category = typeof body.category === 'string' ? body.category : '';
  const size = typeof body.size === 'string' ? body.size.trim() : '';
  const condition = typeof body.condition === 'string' ? body.condition : '';
  const price = typeof body.price === 'string' || typeof body.price === 'number'
    ? Number(body.price)
    : Number.NaN;
  const audiences = Array.isArray(body.audiences)
    ? body.audiences
    : typeof body.audiences === 'string' ? [body.audiences] : [];
  const fieldErrors = {};
  const titleError = itemNameError(title);
  if (titleError) fieldErrors.title = titleError;
  if (description.length < 10 || description.length > 1000) {
    fieldErrors.description = 'Describe your item in 10–1,000 characters.';
  }
  if (!listingCategories.includes(category)) fieldErrors.category = 'Choose an item category.';
  if (!Number.isInteger(price) || price < 1 || price > 10000000) {
    fieldErrors.price = 'Enter a whole-number price from ₱1 to ₱10,000,000.';
  }
  if (!size || size.length > 40) fieldErrors.size = 'Enter a size of 1–40 characters.';
  if (!listingConditions.includes(condition)) fieldErrors.condition = 'Choose the item’s condition.';
  if (!audiences.length || audiences.length > listingAudiences.length ||
      audiences.some(value => !listingAudiences.includes(value)) ||
      new Set(audiences).size !== audiences.length) {
    fieldErrors.audiences = 'Choose at least one audience: Woman, Men, or Kids.';
  }
  return {
    fieldErrors,
    product: { title, description, category, price, size, condition, audiences }
  };
}
