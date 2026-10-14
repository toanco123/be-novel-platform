// Tên hàng đợi và job tập trung một chỗ (API đẩy job, worker xử lý). Thêm hàng đợi: thêm ở đây và
// registerQueue trong module dùng nó; processor đặt trong WorkerModule.
export const QUEUES = {
  /** Job hệ thống; `ping` để kiểm tra đường đi API → Redis → worker */
  system: 'system',
  /** Gửi email (xác nhận email, đặt lại mật khẩu...) */
  mail: 'mail',
} as const

export const SYSTEM_JOBS = {
  ping: 'ping',
} as const

export const MAIL_JOBS = {
  send: 'send',
} as const
