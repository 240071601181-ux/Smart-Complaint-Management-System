import { Router } from 'express';
import { checkAvailability, createBooking, getBooking } from '../controllers/calendarController';

const router = Router();

router.post('/bookings', createBooking);
router.get('/bookings/:id', getBooking);
router.get('/availability', checkAvailability);

export default router;
