import { createContext, useContext, useMemo, useState } from 'react';

// Keeps the guest's selection (slot, vehicle, date, time) so nothing is lost when they log in.
const KEY = 'pw_pending_booking';
const BookingContext = createContext(null);
export const useBooking = () => useContext(BookingContext);

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
};

export function BookingProvider({ children }) {
  const [pending, setPendingState] = useState(read);
  const value = useMemo(
    () => ({
      pending,
      setPending: (p) => { localStorage.setItem(KEY, JSON.stringify(p)); setPendingState(p); },
      clearPending: () => { localStorage.removeItem(KEY); setPendingState(null); },
    }),
    [pending]
  );
  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}
