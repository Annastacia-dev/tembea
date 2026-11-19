'use client';

// Picks a trip in the booking form and scrolls to it.
export default function PlanButton({ trip, children }) {
  return (
    <button
      className="btn"
      type="button"
      onClick={() => {
        window.dispatchEvent(new CustomEvent('tembea:plan', { detail: trip }));
        document.getElementById('book')?.scrollIntoView();
      }}
    >
      {children}
    </button>
  );
}
