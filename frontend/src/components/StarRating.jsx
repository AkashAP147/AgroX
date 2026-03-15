import { useState } from 'react';
import { Star } from 'lucide-react';

/**
 * StarRating component
 *
 * Interactive mode (editable=true):  clickable stars + optional comment + submit
 * Display mode   (editable=false): read-only stars with value + count
 */
export default function StarRating({
  value = 0,
  totalRatings = 0,
  editable = false,
  onSubmit,
  loading = false,
  compact = false
}) {
  const [hover, setHover] = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment, setComment] = useState('');

  // --- Display-only mode ---
  if (!editable) {
    if (value <= 0 && totalRatings <= 0) return null;
    return (
      <div className={`flex items-center gap-1 ${compact ? '' : 'mt-1'}`}>
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} transition-colors ${
              i <= Math.round(value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className={`font-semibold text-gray-700 ${compact ? 'text-[10px]' : 'text-xs'} ml-0.5`}>
          {value.toFixed(1)}
        </span>
        <span className={`text-gray-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>
          ({totalRatings})
        </span>
      </div>
    );
  }

  // --- Interactive mode ---
  function handleSubmit() {
    if (selected < 1) return;
    onSubmit?.({ rating: selected, comment: comment.trim() });
  }

  return (
    <div className="space-y-3 animate-scale-in">
      {/* Stars */}
      <div className="flex items-center justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setSelected(i)}
            className="p-1 rounded-lg hover:bg-amber-50 transition-all duration-150 focus:outline-none"
          >
            <Star
              className={`w-8 h-8 transition-all duration-200 ${
                i <= (hover || selected)
                  ? 'text-amber-400 fill-amber-400 scale-110'
                  : 'text-gray-300 hover:text-amber-200'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Rating label */}
      {selected > 0 && (
        <p className="text-center text-sm font-semibold text-amber-600 animate-fade-in">
          {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][selected]}
        </p>
      )}

      {/* Comment */}
      <textarea
        className="input text-sm resize-none"
        rows={2}
        placeholder="Add a comment (optional)"
        value={comment}
        onChange={e => setComment(e.target.value)}
        maxLength={200}
      />

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={selected < 1 || loading}
        className="btn btn-primary w-full py-3 text-sm"
      >
        {loading ? 'Submitting...' : `Submit ${selected > 0 ? selected + ' Star' + (selected > 1 ? 's' : '') : 'Rating'}`}
      </button>
    </div>
  );
}
