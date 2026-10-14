// Ngày thống kê tính theo giờ Việt Nam (như Supabase: (now() at time zone 'Asia/Ho_Chi_Minh')::date).
const VIETNAM_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Ngày của thời điểm `date` theo giờ Việt Nam, dạng YYYY-MM-DD (cột date, khóa theo ngày) */
export const vietnamDate = (date: Date = new Date()) => VIETNAM_DAY.format(date)
