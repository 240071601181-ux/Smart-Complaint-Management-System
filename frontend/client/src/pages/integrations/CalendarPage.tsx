import { useState } from "react";
import { useLocation } from "wouter";
import { IntegrationPage } from "./IntegrationPage";
import { BookingDialog } from "./BookingDialog";
import { useToast } from "@/layouts/AppLayout";
import { bookings } from "@/mock/details";
import { Button, Card } from "@/components/app/ui";

/**
 * Phase 14C-8: the bookings table stays on mock/demo rows — the backend
 * exposes no list endpoint, so no list query exists (see
 * `api/hooks/useCalendar.ts`). "New booking" opens an explicit booking
 * dialog backed by POST /api/v1/calendar/bookings; created records open on
 * /calendar/:id, which resolves genuine backend ids through
 * GET /api/v1/calendar/bookings/:id. This table will switch once a backend
 * list endpoint lands.
 */
export default function CalendarPage() {
  const { notify } = useToast();
  const [, navigate] = useLocation();
  const [bookingOpen, setBookingOpen] = useState(false);
  return (
    <>
      <IntegrationPage type="/calendar" onToast={notify} />
      <Card className="table-card" style={{ marginTop: 14 }}>
        <div className="card-header table-header">
          <div><span className="section-kicker">MEETINGS</span><h2>Scheduled bookings</h2></div>
          <Button variant="secondary" onClick={() => setBookingOpen(true)}>New booking</Button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Meeting</th><th>When</th><th>Status</th><th /></tr></thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} onClick={() => navigate(`/calendar/${b.id}`)}>
                  <td><b className="table-main">{b.title}</b><small className="table-sub">{b.id} · {b.attendees}</small></td>
                  <td>{b.when}</td>
                  <td><span className="status-pill"><i />{b.status}</span></td>
                  <td><span className="status-label">{b.duration}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <BookingDialog open={bookingOpen} onOpenChange={setBookingOpen} />
    </>
  );
}
