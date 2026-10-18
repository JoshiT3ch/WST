export async function requestApi(path, options = {}) {
  if (window.location.protocol === 'file:') throw new Error('Start Finds with npm start and open http://localhost:3000.');
  const response = await fetch(path, {
    ...options,
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(10000)])
      : AbortSignal.timeout(10000)
  });
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('The Finds API is unavailable. Open the website through the Node.js server.');
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to complete your request. Please try again.');
  return data;
}

export function errorMessage(error) {
  if (error.name === 'TimeoutError') return 'The request took too long. Please try again.';
  if (error instanceof TypeError) return 'Unable to reach Finds. Check your connection and try again.';
  return error.message;
}

const priceFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', maximumFractionDigits: 0
});
export const formatPrice = item => priceFormatter.format(item.price);
